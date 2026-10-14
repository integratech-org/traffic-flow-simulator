"""Nagel-Schreckenberg cellular automaton on the network.json lanes."""

from collections.abc import Sequence
from typing import Any

import numpy as np
from numpy.typing import NDArray

from src.engine.signals import SignalController
from src.network.schemas import Lane as NetworkLane
from src.network.schemas import Network
from src.simulation.schemas import (
    CreateRunRequest,
    DensityScenario,
    SignalPlan,
    VehicleType,
    WeatherCondition,
)

CAR, MOTO = 0, 1
TYPE_NAMES = {CAR: "car", MOTO: "motorcycle"}

TICK_SECONDS = 1.0  # 1 tick = 1 second of simulated time

# one signal per leg; inbound lanes stop at their leg's signal.
# (arbitrary order: reorder to match your UI labels)
LEG_SIGNAL = {
    "mindanao_sw": "S1",
    "commonwealth_sw": "S2",
    "mindanao_ne": "S3",
    "commonwealth_ne": "S4",
}

SPAWN_RATE = {  # chance per tick, per entry lane
    DensityScenario.LIGHT: 0.04,
    DensityScenario.MODERATE: 0.08,
    DensityScenario.HEAVY: 0.14,
}
RAIN_EXTRA_P_SLOW = 0.10
ACCIDENT_P_SLOW = 0.80  # Fixed: very strong slowdown effect (80%)
ACCIDENT_RADIUS_METERS = 8  # Fixed: small radius (8 meters)
FREE = 10_000  # "nothing ahead"
EXIT_GAP = 20  # cells a lead vehicle sees past the end of an exit lane
LIGHT_MAX, MODERATE_MAX = 0.15, 0.35  # density thresholds for congestion level

I64 = np.int64
IntArray = NDArray[np.int64]
_COLS = ("pos", "spd", "vid", "vtype", "wait")


def to_cells_per_tick(speed_mps: float, cell_size_m: float) -> int:
    """API speeds are in m/s; the CA moves in whole cells per tick.
    With 7.5 m cells and 1 s ticks: 15 m/s -> 2 cells, 20 m/s -> 3 cells."""
    return round(speed_mps * TICK_SECONDS / cell_size_m)


class LaneState:
    def __init__(self, lane_id: str, data: NetworkLane) -> None:
        self.id = lane_id
        self.length = data.numCells
        self.leg_id = data.legId
        self.direction = data.direction
        self.signal_id = (
            LEG_SIGNAL.get(self.leg_id) if self.direction == "inbound" else None
        )
        self.next_id = data.connectsTo
        # vehicles kept sorted ascending by position (last = lead vehicle)
        self.pos: IntArray = np.empty(0, I64)
        self.spd: IntArray = np.empty(0, I64)
        self.vid: IntArray = np.empty(0, I64)
        self.vtype: IntArray = np.empty(0, I64)
        self.wait: IntArray = np.empty(0, I64)  # ticks spent stopped

    @property
    def n(self) -> int:
        return len(self.pos)

    @property
    def rear(self) -> int:
        return int(self.pos[0]) if self.n else FREE

    def add(
        self,
        pos: Sequence[int] | IntArray,
        spd: Sequence[int] | IntArray,
        vid: Sequence[int] | IntArray,
        vtype: Sequence[int] | IntArray,
        wait: Sequence[int] | IntArray,
    ) -> None:
        self.pos = np.concatenate([self.pos, np.asarray(pos, I64)])
        self.spd = np.concatenate([self.spd, np.asarray(spd, I64)])
        self.vid = np.concatenate([self.vid, np.asarray(vid, I64)])
        self.vtype = np.concatenate([self.vtype, np.asarray(vtype, I64)])
        self.wait = np.concatenate([self.wait, np.asarray(wait, I64)])
        order = np.argsort(self.pos, kind="stable")
        for name in _COLS:
            setattr(self, name, getattr(self, name)[order])

    def keep(self, mask: NDArray[np.bool_]) -> None:
        for name in _COLS:
            setattr(self, name, getattr(self, name)[mask])


class TrafficEngine:
    def __init__(self, network: Network, config: CreateRunRequest) -> None:
        self.lanes = {lid: LaneState(lid, d) for lid, d in network.lanes.items()}
        targets = {lane.next_id for lane in self.lanes.values() if lane.next_id}
        self.entry_lanes = [
            lane for lane in self.lanes.values() if lane.id not in targets
        ]

        self.signals = SignalController(config.signal_plan)
        self.rng = np.random.default_rng(config.seed)
        self.tick = 0
        self.next_vid = 0
        self.accidents: list[Any] = []  # Will hold Accident objects
        self.network = network  # Store network for coordinate lookups

        vp = config.vehicle_params
        car, moto = vp[VehicleType.CAR], vp[VehicleType.MOTORCYCLE]
        cell = network.cellSizeMeters
        vmax = [
            max(1, to_cells_per_tick(car.v_max, cell)),
            max(1, to_cells_per_tick(moto.v_max, cell)),
        ]
        vmin = [
            min(to_cells_per_tick(car.v_min, cell), vmax[CAR]),
            min(to_cells_per_tick(moto.v_min, cell), vmax[MOTO]),
        ]
        self.vmax = np.array(vmax, I64)
        self.vmin = np.array(vmin, I64)
        extra = (
            RAIN_EXTRA_P_SLOW
            if config.weather_condition == WeatherCondition.RAINY
            else 0.0
        )
        self.pslow = np.clip([car.p_slow + extra, moto.p_slow + extra], 0, 1)

        self.spawn_rate = SPAWN_RATE[config.density_scenario]
        self.moto_share = config.vehicle_mix.two_wheeler_pct / 100

        self.exited = {CAR: 0, MOTO: 0}
        self.wait_total = 0
        self.max_queue = 0

    # ---- control ----
    def set_signal_plan(self, plan: SignalPlan) -> None:
        self.signals.set_plan(plan)

    def add_accident(self, accident: Any) -> None:
        """Add an accident to the simulation."""
        self.accidents.append(accident)

    def remove_accident(self, accident_id: str) -> bool:
        """Remove an accident by ID. Returns True if found and removed."""
        before = len(self.accidents)
        self.accidents = [a for a in self.accidents if a.id != accident_id]
        return len(self.accidents) < before

    def get_active_accidents(self) -> list[Any]:
        """Get all currently active accidents, auto-cleanup expired ones."""
        active = [a for a in self.accidents if a.is_active(self.tick)]
        self.accidents = active
        return active

    def _is_vehicle_in_accident_zone(self, lane: LaneState, vehicle_idx: int) -> bool:
        """Check if a vehicle is in any accident zone. Returns True if yes."""
        if not self.accidents:
            return False

        # Get vehicle's position on the lane
        cell_idx = int(lane.pos[vehicle_idx])
        if cell_idx >= len(self.network.lanes[lane.id].cellCoords):
            return False

        # ACCIDENT_FIX: network.json stores coords as [longitude, latitude]
        # Must unpack in correct order: lon first, lat second
        lon, lat = self.network.lanes[lane.id].cellCoords[cell_idx]

        # Check each active accident
        for accident in self.get_active_accidents():
            # ACCIDENT_FIX: Calculate distance using correct coordinate order
            # accident.lat and accident.lon are in standard geographic order
            # Rough approximation: 1 degree lat/lon ≈ 111km
            lat_diff = abs(lat - accident.lat) * 111000
            lon_diff = abs(lon - accident.lon) * 111000
            dist = np.sqrt(lat_diff**2 + lon_diff**2)

            if dist <= ACCIDENT_RADIUS_METERS:
                return True

        return False

    # ---- one NaSch tick ----
    def step(self) -> None:
        # Pass 1: new speeds for every lane, computed from the OLD state
        new_speed: dict[str, IntArray] = {}
        for lane in self.lanes.values():
            if lane.n == 0:
                continue
            vt = lane.vtype
            gap: IntArray = np.empty(lane.n, I64)
            gap[:-1] = lane.pos[1:] - lane.pos[:-1] - 1
            to_end = lane.length - 1 - lane.pos[-1]
            if lane.signal_id and not self.signals.can_pass(lane.signal_id, self.tick):
                gap[-1] = to_end  # stop line
            elif lane.next_id:
                gap[-1] = to_end + self.lanes[lane.next_id].rear  # room in next lane
            else:
                gap[-1] = to_end + EXIT_GAP

            v = np.minimum(lane.spd + 1, self.vmax[vt])  # 1. accelerate
            v = np.minimum(v, gap)  # 2. no collision

            # 3. random slowdown (base + accident-affected)
            pslow_effective = np.full(lane.n, self.pslow[vt[0]], dtype=float)
            for i in range(lane.n):
                in_accident_zone = self._is_vehicle_in_accident_zone(lane, i)
                if in_accident_zone:
                    pslow_effective[i] = min(pslow_effective[i] + ACCIDENT_P_SLOW, 1.0)

            slow = (self.rng.random(lane.n) < pslow_effective) & (v > 0)
            v = v - slow
            v = np.maximum(v, np.minimum(self.vmin[vt], gap))  # optional min speed
            new_speed[lane.id] = v

        # Pass 2: move (4.)
        for lane in self.lanes.values():
            if lane.n == 0:
                continue
            lane.spd = new_speed[lane.id]
            lane.pos = lane.pos + lane.spd
            lane.wait = lane.wait + (lane.spd == 0)
            self.max_queue = max(self.max_queue, int((lane.spd == 0).sum()))

        # Pass 3: hand over / exit vehicles past the end of their lane
        for lane in self.lanes.values():
            if lane.n == 0:
                continue
            out = lane.pos >= lane.length
            if not out.any():
                continue
            if lane.next_id:
                self.lanes[lane.next_id].add(
                    lane.pos[out] - lane.length,
                    lane.spd[out],
                    lane.vid[out],
                    lane.vtype[out],
                    lane.wait[out],
                )
            else:
                for t in (CAR, MOTO):
                    self.exited[t] += int((lane.vtype[out] == t).sum())
                self.wait_total += int(lane.wait[out].sum())
            lane.keep(~out)

        self._spawn()
        self.tick += 1

    def _spawn(self) -> None:
        for lane in self.entry_lanes:
            if self.rng.random() < self.spawn_rate and (lane.n == 0 or lane.pos[0] > 0):
                vt = MOTO if self.rng.random() < self.moto_share else CAR
                lane.add([0], [0], [self.next_vid], [vt], [0])
                self.next_vid += 1

    # ---- output ----
    def snapshot(self) -> dict[str, Any]:
        vehicles: list[dict[str, Any]] = []
        congestion: list[dict[str, Any]] = []
        for lane in self.lanes.values():
            for vid, vt, pos, spd in zip(
                lane.vid.tolist(),
                lane.vtype.tolist(),
                lane.pos.tolist(),
                lane.spd.tolist(),
                strict=True,
            ):
                vehicles.append(
                    {
                        "id": vid,
                        "type": TYPE_NAMES[vt],
                        "lane_id": lane.id,
                        "cell": pos,  # index into the lane's cellCoords
                        "speed": spd,  # cells per tick (x cellSizeMeters = m/s)
                    }
                )
            density = lane.n / lane.length
            level = (
                "light"
                if density < LIGHT_MAX
                else "moderate"
                if density < MODERATE_MAX
                else "heavy"
            )
            congestion.append(
                {
                    "lane_id": lane.id,
                    "level": level,
                    "density": round(density, 3),
                    "volume": lane.n,
                }
            )
        signals = [
            {
                "signal_id": sid,
                "leg_id": leg,
                "phase": self.signals.phase(sid, self.tick).value,
            }
            for leg, sid in LEG_SIGNAL.items()
        ]
        return {
            "vehicles": vehicles,
            "congestion": congestion,
            "signals": signals,
            "metrics": self.metrics(),
            "accidents": [
                {
                    "id": a.id,
                    "lat": a.lat,
                    "lon": a.lon,
                    "severity": a.severity.value,
                    "duration_seconds": a.duration_seconds,
                    "created_at_tick": a.created_at_tick,
                }
                for a in self.get_active_accidents()
            ],
        }

    def metrics(self) -> dict[str, float]:
        done = sum(self.exited.values())
        return {
            "throughput": done,
            "avg_wait": self.wait_total / done if done else 0.0,
            "max_queue": self.max_queue,
            "two_wheeler_pct": 100 * self.exited[MOTO] / done if done else 0.0,
            "four_wheeler_pct": 100 * self.exited[CAR] / done if done else 0.0,
        }
