import asyncio
import contextlib
import logging
import uuid
from typing import Any

from fastapi import WebSocket

from src.engine.engine import TrafficEngine
from src.network.schemas import Network
from src.simulation.models import Run
from src.simulation.schemas import (
    Accident,
    CreateRunRequest,
    RunState,
    SignalPlan,
    TickMessage,
    VehicleType,
)

logger = logging.getLogger(__name__)

RUNS: dict[str, Run] = {}
TICK_INTERVAL = (
    0.5  # seconds of real time between ticks (2 ticks/sec for smoother visualization)
)


# ---------- lifecycle ----------


def create_run(config: CreateRunRequest, network: Network) -> Run:
    run_id = uuid.uuid4().hex[:8]
    run = Run(run_id=run_id, config=config, engine=TrafficEngine(network, config))
    RUNS[run_id] = run
    return run


async def _tick_loop(run: Run) -> None:
    while True:
        if run.engine is not None:
            run.engine.step()
            run.tick = run.engine.tick
        else:
            run.tick += 1
        await broadcast(run)
        await asyncio.sleep(TICK_INTERVAL)


def _on_loop_done(run: Run, task: asyncio.Task[None]) -> None:
    # without this, an exception inside the loop dies silently
    if task.cancelled():
        return
    exc = task.exception()
    if exc is not None:
        logger.error("Tick loop crashed for run %s", run.run_id, exc_info=exc)
        run.state = RunState.PAUSED


def _stop_task(run: Run) -> None:
    if run.task is not None:
        run.task.cancel()
        run.task = None


def start_run(run: Run) -> Run:
    if run.state == RunState.RUNNING:
        return run  # already running: no-op
    run.state = RunState.RUNNING
    run.task = asyncio.create_task(_tick_loop(run))
    run.task.add_done_callback(lambda t: _on_loop_done(run, t))
    return run


def pause_run(run: Run) -> Run:
    if run.state != RunState.RUNNING:
        return run  # created/paused: no-op
    _stop_task(run)
    run.state = RunState.PAUSED
    return run


def update_signal_plan(run: Run, plan: SignalPlan) -> Run:
    # takes effect on the next tick (SignalController is stateless)
    run.config.signal_plan = plan
    if run.engine is not None:
        run.engine.set_signal_plan(plan)
    return run


def add_accident(run: Run, accident: Accident) -> Accident:
    """Add an accident to the simulation."""
    if run.engine is not None:
        run.engine.add_accident(accident)
    return accident


def get_accidents(run: Run) -> list[Accident]:
    """Get all active accidents."""
    if run.engine is not None:
        return run.engine.get_active_accidents()
    return []


def remove_accident(run: Run, accident_id: str) -> None:
    """Remove an accident from the simulation."""
    if run.engine is not None:
        run.engine.remove_accident(accident_id)


async def delete_run(run: Run) -> None:
    _stop_task(run)
    RUNS.pop(run.run_id, None)
    for ws in list(run.subscribers):
        with contextlib.suppress(Exception):
            await ws.close(code=1000, reason="Run deleted")
    run.subscribers.clear()


# ---------- streaming ----------


def build_message(run: Run) -> TickMessage:
    snap = run.engine.snapshot() if run.engine is not None else {}
    return TickMessage.model_validate(
        {"run_id": run.run_id, "state": run.state, "tick": run.tick, **snap}
    )


def _payload_for(
    payload: dict[str, Any], vehicle_type: VehicleType | None
) -> dict[str, Any]:
    if vehicle_type is None:
        return payload
    return {
        **payload,
        "vehicles": [v for v in payload["vehicles"] if v["type"] == vehicle_type.value],
    }


async def send_to(
    run: Run,
    ws: WebSocket,
    vehicle_type: VehicleType | None,
    payload: dict[str, Any] | None = None,
) -> None:
    if payload is None:
        payload = build_message(run).model_dump(mode="json")
    await ws.send_json(_payload_for(payload, vehicle_type))


async def broadcast(run: Run) -> None:
    if not run.subscribers:
        return
    # build once, filter per client
    payload = build_message(run).model_dump(mode="json")
    items = list(run.subscribers.items())
    results = await asyncio.gather(
        *(send_to(run, ws, vt, payload) for ws, vt in items),
        return_exceptions=True,
    )
    for (ws, _), res in zip(items, results, strict=True):
        if isinstance(res, Exception):  # dead connection
            run.subscribers.pop(ws, None)
