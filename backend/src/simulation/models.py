import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime

from fastapi import WebSocket

from src.engine.engine import TrafficEngine
from src.simulation.schemas import CreateRunRequest, RunState, VehicleType


@dataclass
class Run:
    run_id: str
    config: CreateRunRequest
    state: RunState = RunState.CREATED
    tick: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    engine: TrafficEngine | None = field(default=None, repr=False)
    task: asyncio.Task[None] | None = field(
        default=None, repr=False
    )  # tick loop (start/pause)
    subscribers: dict[WebSocket, VehicleType | None] = field(
        default_factory=dict, repr=False
    )  # WebSocket subscribers and their vehicle type filters
