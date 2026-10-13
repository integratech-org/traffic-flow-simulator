from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from src.simulation import service
from src.simulation.dependencies import valid_run_id
from src.simulation.models import Run
from src.simulation.schemas import (
    CreateRunRequest,
    RunStateResponse,
    SignalPlan,
    VehicleType,
)

router = APIRouter(prefix="/simulation", tags=["Simulation"])

RunDep = Annotated[Run, Depends(valid_run_id)]


@router.post(
    "/runs", response_model=RunStateResponse, status_code=status.HTTP_201_CREATED
)
async def create_simulation_run(
    config: CreateRunRequest, request: Request
) -> RunStateResponse:
    # network_data is loaded once in the lifespan (see main.py)
    run = service.create_run(config, request.state.network_data)
    return RunStateResponse.model_validate(run)


@router.get("/runs/{run_id}", response_model=RunStateResponse)
async def get_run_status(run: RunDep) -> RunStateResponse:
    return RunStateResponse.model_validate(run)


# NOTE: must be `async def` so asyncio.create_task has a running event loop
@router.post("/runs/{run_id}/start", response_model=RunStateResponse)
async def start_run(run: RunDep) -> RunStateResponse:
    return RunStateResponse.model_validate(service.start_run(run))


@router.post("/runs/{run_id}/pause", response_model=RunStateResponse)
async def pause_run(run: RunDep) -> RunStateResponse:
    return RunStateResponse.model_validate(service.pause_run(run))


@router.put("/runs/{run_id}/signal-plan", response_model=RunStateResponse)
async def update_signal_plan(run: RunDep, plan: SignalPlan) -> RunStateResponse:
    return RunStateResponse.model_validate(service.update_signal_plan(run, plan))


@router.delete("/runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_run(run: RunDep) -> None:
    await service.delete_run(run)


@router.websocket("/runs/{run_id}/stream")
async def stream_run_ticks(
    websocket: WebSocket,
    run_id: str,
    vehicle_type: VehicleType | None = None,
) -> None:
    await websocket.accept()
    run = service.RUNS.get(run_id)
    if run is None:
        await websocket.close(code=4404, reason="Run not found")
        return

    run.subscribers[websocket] = vehicle_type
    try:
        # send the current state immediately so the map isn't blank while paused
        await service.send_to(run, websocket, vehicle_type)
        while True:
            data = await websocket.receive_json()
            # switch the 2W/4W toggle without reconnecting:
            #   {"vehicle_type": "motorcycle"}  or  {"vehicle_type": null}
            try:
                value = data.get("vehicle_type")
                run.subscribers[websocket] = VehicleType(value) if value else None
            except (ValueError, AttributeError):
                await websocket.send_json({"error": "invalid vehicle_type"})
    except WebSocketDisconnect:
        pass
    finally:
        run.subscribers.pop(websocket, None)
