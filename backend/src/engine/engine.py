"""Nagel-Schreckenberg cellular automaton on the network.json lanes."""

from collections.abc import Sequence
from typing import Any

import numpy as np
from numpy.typing import NDArray

from src.engine.demand import spawn_rate as scenario_spawn_rate
from src.engine.signals import SignalController
from src.network.schemas import Lane as NetworkLane
from src.network.schemas import Network
from src.simulation.schemas import (
    CreateRunRequest,
    SignalPlan,
    VehicleType,
    WeatherCondition,
)

CAR, MOTO = 0, 1
TYPE_NAMES = {CAR: "car", MOTO: "motorcycle"}

# TASK_SEGMENTED_CONGESTION: Segment size for granular congestion visualization
SEGMENT_SIZE = 20  # cells (100m with 5m cell size) - detailed Google Maps-style

TICK_SECONDS = 1.0  # 1 tick = 1 second of simulated time

# one signal per leg; inbound lanes stop at their leg's signal.
# (arbitrary order: reorder to match your UI labels)
LEG_SIGNAL = {
    "mindanao_sw": "S1",
    "commonwealth_sw": "S2",
    "mindanao_ne": "S3",
    "commonwealth_ne": "S4",
}

RAIN_EXTRA_P_SLOW = 0.10
ACCIDENT_RADIUS_METERS = 150  # Accident affect zone (150 meters = ~20 cells)
ACCIDENT_APPROACH_METERS = 300  # Early warning zone (300 meters = ~40 cells)
ACCIDENT_SPEED_LIMIT = 1  # Max speed in accident zone (1 cell/tick = ~7.5 m/s)
ACCIDENT_APPROACH_SPEED = 2  # Max speed approaching accident (2 cells/tick)
FREE = 10_000  # "nothing ahead"
EXIT_GAP = 20  # cells a lead vehicle sees past the end of an exit lane
LIGHT_MAX, MODERATE_MAX = 0.15, 0.35  # density thresholds for congestion level
METERS_PER_DEGREE_LAT = (
    111320  # approximate meters per degree latitude (for distance calculation)
)

# TASK8: Lane-changing parameters (MOBIL model)
P_CHANGE_CAR = 0.12  # Probability of attempting lane change per tick for cars (12%)
P_CHANGE_MOTO = 0.20  # Motorcycles more aggressive (20%)
MIN_GAP_AHEAD = 3  # Minimum safe gap ahead in target lane (3 cells)
MIN_GAP_BEHIND = 2  # Minimum safe gap behind in target lane (2 cells)
ADVANTAGE_THRESHOLD = 1  # Minimum speed advantage to justify change (1 cell/tick)
POLITENESS_CAR = 0.3  # Cars more polite (care about others)
POLITENESS_MOTO = 0.1  # Motorcycles less polite (more aggressive)

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
        self.lane_index = data.laneIndex  # TASK8: Store lane index
        self.cellCoords = (
            data.cellCoords
        )  # TASK10: Store coordinates for accident detection
        self.signal_id = (
            LEG_SIGNAL.get(self.leg_id) if self.direction == "inbound" else None
        )
        self.next_id = data.connectsTo
        # TASK8: Lane adjacency for lane-changing
        self.left_neighbor: str | None = None
        self.right_neighbor: str | None = None
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
        new_pos = np.asarray(pos, I64)
        new_spd = np.asarray(spd, I64)
        new_vid = np.asarray(vid, I64)
        new_vtype = np.asarray(vtype, I64)
        new_wait = np.asarray(wait, I64)

        # Safety check: prevent adding vehicles at positions that already have vehicles
        if self.n > 0:
            # Create a mask for positions that don't conflict with existing vehicles
            safe_mask = np.ones(len(new_pos), dtype=bool)
            for i, p in enumerate(new_pos):
                # Check if any existing vehicle is at this exact position
                if np.any(self.pos == p):
                    safe_mask[i] = False

            # Only add vehicles that don't cause overlap
            if not safe_mask.any():
                return  # All positions would cause overlap, don't add anything

            new_pos = new_pos[safe_mask]
            new_spd = new_spd[safe_mask]
            new_vid = new_vid[safe_mask]
            new_vtype = new_vtype[safe_mask]
            new_wait = new_wait[safe_mask]

        self.pos = np.concatenate([self.pos, new_pos])
        self.spd = np.concatenate([self.spd, new_spd])
        self.vid = np.concatenate([self.vid, new_vid])
        self.vtype = np.concatenate([self.vtype, new_vtype])
        self.wait = np.concatenate([self.wait, new_wait])
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

        # TASK8: Build lane adjacency graph for lane-changing
        self._build_lane_adjacency()

        self.signals = SignalController(config.signal_plan)
        self.rng = np.random.default_rng(config.seed)
        self.tick = 0
        self.next_vid = 0
        self.accidents: list[Any] = []  # Will hold Accident objects
        self.network = network  # Store network for coordinate lookups

        vp = config.vehicle_params
        car, moto = vp[VehicleType.CAR], vp[VehicleType.MOTORCYCLE]
        cell = network.cellSizeMeters
        # FIX_TASK1: Only track vmax - standard NaSch allows speed=0 naturally
        vmax = [
            max(1, to_cells_per_tick(car.v_max, cell)),
            max(1, to_cells_per_tick(moto.v_max, cell)),
        ]
        self.vmax = np.array(vmax, I64)
        extra = (
            RAIN_EXTRA_P_SLOW
            if config.weather_condition == WeatherCondition.RAINY
            else 0.0
        )
        self.pslow = np.clip([car.p_slow + extra, moto.p_slow + extra], 0, 1)

        self.spawn_rate = scenario_spawn_rate(config)
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

    def _get_accident_block_position(self, lane: LaneState) -> int | None:
        """Get the cell position where accident blocks the lane, or None if no blocking accident."""
        if not self.accidents:
            return None

        # Check each cell in the lane for active accidents
        for cell_idx in range(lane.length):
            if cell_idx >= len(self.network.lanes[lane.id].cellCoords):
                continue

            lon, lat = self.network.lanes[lane.id].cellCoords[cell_idx]

            for accident in self.get_active_accidents():
                lat_diff = abs(lat - accident.lat) * 111000
                lon_diff = abs(lon - accident.lon) * 111000
                dist = np.sqrt(lat_diff**2 + lon_diff**2)

                if dist <= ACCIDENT_RADIUS_METERS:
                    return cell_idx  # Found a blocking accident at this position

        return None

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

    def _is_vehicle_approaching_accident(
        self, lane: LaneState, vehicle_idx: int
    ) -> bool:
        """Check if a vehicle is approaching any accident (within warning distance)."""
        if not self.accidents:
            return False

        # Get vehicle's position
        cell_idx = int(lane.pos[vehicle_idx])
        if cell_idx >= len(self.network.lanes[lane.id].cellCoords):
            return False

        lon, lat = self.network.lanes[lane.id].cellCoords[cell_idx]

        # Check if approaching any active accident
        for accident in self.get_active_accidents():
            lat_diff = abs(lat - accident.lat) * 111000
            lon_diff = abs(lon - accident.lon) * 111000
            dist = np.sqrt(lat_diff**2 + lon_diff**2)

            if dist <= ACCIDENT_APPROACH_METERS:
                return True

        return False

    def _adjust_speed_for_leader(
        self, lane: LaneState, v: IntArray, gap: IntArray, accident_affected: np.ndarray
    ) -> IntArray:
        """FIX_TASK3: Adjust speed based on vehicle ahead's type and speed.

        Vehicles now recognize the vehicle in front and adjust behavior:
        - Match speed of slower vehicles ahead
        - Be extra cautious when fast vehicle behind slow vehicle
        - Prevent speed mismatch collisions

        OPTION 3: Skip vehicle recognition if in accident zone to prevent chain reaction
        """
        if lane.n <= 1:
            return v  # Lead vehicle or empty lane - no adjustment needed

        for i in range(lane.n - 1):  # All vehicles except lead vehicle
            # OPTION 3: Skip vehicle recognition for vehicles in accident zones
            if accident_affected[i]:
                continue  # Let accident slowdown handle speed independently

            my_type = lane.vtype[i]
            leader_type = lane.vtype[i + 1]
            leader_speed = lane.spd[i + 1]
            gap_to_leader = int(gap[i])

            # Basic rule: Don't go much faster than vehicle ahead
            # Allow some speed advantage based on available gap
            safe_speed = leader_speed + min(gap_to_leader // 2, 2)
            v[i] = min(v[i], safe_speed)

            # Special case: Fast vehicle (motorcycle) behind slow vehicle (car)
            if self.vmax[my_type] > self.vmax[leader_type] and gap_to_leader < 4:
                # Extra caution when following slower vehicle type (close following distance)
                v[i] = min(v[i], leader_speed)  # Match speed exactly

        return v

    def _build_lane_adjacency(self) -> None:
        """TASK8: Build lane adjacency graph for lane-changing."""
        for lane in self.lanes.values():
            # Left neighbor (laneIndex + 1)
            left_id = f"{lane.leg_id}_{lane.direction}_lane{lane.lane_index + 1}"
            if left_id in self.lanes:
                lane.left_neighbor = left_id
            # Right neighbor (laneIndex - 1)
            if lane.lane_index > 0:
                right_id = f"{lane.leg_id}_{lane.direction}_lane{lane.lane_index - 1}"
                if right_id in self.lanes:
                    lane.right_neighbor = right_id

    def _can_change_lane_safe(
        self, from_lane: LaneState, vehicle_index: int, to_lane_id: str
    ) -> bool:
        """TASK8: Safety check for lane change."""
        to_lane = self.lanes.get(to_lane_id)
        if not to_lane:
            return False
        vehicle_pos = int(from_lane.pos[vehicle_index])
        # Don't change near intersection
        if vehicle_pos > from_lane.length * 0.9:
            return False
        ahead_gap, behind_gap = FREE, FREE
        for i in range(to_lane.n):
            target_pos = int(to_lane.pos[i])
            if target_pos > vehicle_pos:
                ahead_gap = min(ahead_gap, target_pos - vehicle_pos - 1)
            elif target_pos < vehicle_pos:
                behind_gap = min(behind_gap, vehicle_pos - target_pos - 1)
            else:
                return False  # Overlap
        return ahead_gap >= MIN_GAP_AHEAD and behind_gap >= MIN_GAP_BEHIND

    def _calculate_lane_change_incentive(
        self, from_lane: LaneState, vehicle_index: int, to_lane_id: str
    ) -> float:
        """TASK8: MOBIL incentive calculation."""
        to_lane = self.lanes.get(to_lane_id)
        if not to_lane:
            return -999.0
        vehicle_type = from_lane.vtype[vehicle_index]
        vehicle_pos = int(from_lane.pos[vehicle_index])
        # Current gap
        if vehicle_index >= from_lane.n - 1:
            current_gap = from_lane.length - 1 - vehicle_pos
        else:
            current_gap = int(from_lane.pos[vehicle_index + 1] - vehicle_pos - 1)
        current_max_speed = min(self.vmax[vehicle_type], current_gap)
        # New gap
        new_gap = FREE
        for i in range(to_lane.n):
            if to_lane.pos[i] > vehicle_pos:
                new_gap = int(to_lane.pos[i] - vehicle_pos - 1)
                break
        new_max_speed = min(self.vmax[vehicle_type], new_gap)
        advantage_self = new_max_speed - current_max_speed
        # Simplified MOBIL - just speed advantage (politeness term omitted for simplicity)
        return advantage_self

    def _execute_lane_change(
        self, from_lane: LaneState, vehicle_index: int, to_lane_id: str
    ) -> None:
        """TASK8: Transfer vehicle between lanes."""
        to_lane = self.lanes.get(to_lane_id)
        if not to_lane:
            return
        pos = from_lane.pos[vehicle_index : vehicle_index + 1]
        spd = from_lane.spd[vehicle_index : vehicle_index + 1]
        vid = from_lane.vid[vehicle_index : vehicle_index + 1]
        vtype = from_lane.vtype[vehicle_index : vehicle_index + 1]
        wait = from_lane.wait[vehicle_index : vehicle_index + 1]
        keep_mask = np.ones(from_lane.n, dtype=bool)
        keep_mask[vehicle_index] = False
        from_lane.keep(keep_mask)
        to_lane.add(pos, spd, vid, vtype, wait)

    def _process_lane_changes(self) -> None:
        """TASK8 + TASK10: Process lane changes for all vehicles, with accident avoidance."""
        from collections import defaultdict

        lane_changes: list[tuple[str, int, str]] = []
        for lane in self.lanes.values():
            if lane.n == 0:
                continue
            for i in range(lane.n):
                vehicle_type = lane.vtype[i]
                vehicle_pos = int(lane.pos[i])

                # TASK10: Check if approaching accident (look ahead 50 cells)
                is_approaching_accident = False
                if self.accidents:
                    for check_pos in range(
                        vehicle_pos, min(vehicle_pos + 50, lane.length)
                    ):
                        if check_pos < len(lane.cellCoords):
                            cell_lon, cell_lat = lane.cellCoords[check_pos]
                            for accident in self.get_active_accidents():
                                d_lat = (
                                    accident.lat - cell_lat
                                ) * METERS_PER_DEGREE_LAT
                                d_lon = (
                                    (accident.lon - cell_lon)
                                    * METERS_PER_DEGREE_LAT
                                    * np.cos(np.radians(cell_lat))
                                )
                                distance = np.sqrt(d_lat**2 + d_lon**2)
                                if distance <= ACCIDENT_RADIUS_METERS * 2:
                                    is_approaching_accident = True
                                    break
                        if is_approaching_accident:
                            break

                # Higher probability if approaching accident
                p_change = P_CHANGE_MOTO if vehicle_type == MOTO else P_CHANGE_CAR
                if is_approaching_accident:
                    p_change = min(p_change * 3, 0.8)  # 3x more likely

                if self.rng.random() >= p_change:
                    continue
                # Try left first
                if lane.left_neighbor and self._can_change_lane_safe(
                    lane, i, lane.left_neighbor
                ):
                    incentive = self._calculate_lane_change_incentive(
                        lane, i, lane.left_neighbor
                    )
                    # Lower threshold if avoiding accident
                    threshold = -1 if is_approaching_accident else ADVANTAGE_THRESHOLD
                    if incentive > threshold:
                        lane_changes.append((lane.id, i, lane.left_neighbor))
                        continue
                # Try right
                if lane.right_neighbor and self._can_change_lane_safe(
                    lane, i, lane.right_neighbor
                ):
                    incentive = self._calculate_lane_change_incentive(
                        lane, i, lane.right_neighbor
                    )
                    threshold = -1 if is_approaching_accident else ADVANTAGE_THRESHOLD
                    if incentive > threshold:
                        lane_changes.append((lane.id, i, lane.right_neighbor))
        # Execute changes
        changes_by_lane = defaultdict(list)
        for from_id, idx, to_id in lane_changes:
            changes_by_lane[from_id].append((idx, to_id))
        for from_id, changes in changes_by_lane.items():
            changes.sort(key=lambda x: x[0], reverse=True)
            from_lane = self.lanes[from_id]
            for idx, to_id in changes:
                if idx < from_lane.n:
                    self._execute_lane_change(from_lane, idx, to_id)

    # ---- one NaSch tick ----
    def step(self) -> None:
        # TASK8: Pass 0 - Lane-changing (before speed calculation)
        self._process_lane_changes()

        # Pass 1: new speeds for every lane, computed from the OLD state
        new_speed: dict[str, IntArray] = {}
        for lane in self.lanes.values():
            if lane.n == 0:
                continue
            vt = lane.vtype
            gap: IntArray = np.empty(lane.n, I64)
            gap[:-1] = lane.pos[1:] - lane.pos[:-1] - 1
            to_end = lane.length - 1 - lane.pos[-1]

            # FIX_TASK4: Removed accident_block_pos (unused after removing wall blocking logic)

            if lane.signal_id and not self.signals.can_pass(lane.signal_id, self.tick):
                gap[-1] = to_end  # stop line
            elif lane.next_id:
                gap[-1] = to_end + self.lanes[lane.next_id].rear  # room in next lane
            else:
                gap[-1] = to_end + EXIT_GAP

            # Adjust gaps for vehicles approaching an accident
            # FIX_TASK4: Removed solid wall block logic - accidents now cause slowdown, not complete blocking
            # Vehicles can pass through accident zones (removed gap restriction)

            # ACCIDENT DETECTION: Identify vehicles in accident zones and approaching
            accident_affected = np.zeros(lane.n, dtype=bool)  # In accident zone
            accident_approaching = np.zeros(lane.n, dtype=bool)  # Approaching accident

            for i in range(lane.n):
                in_zone = self._is_vehicle_in_accident_zone(lane, i)
                approaching = self._is_vehicle_approaching_accident(lane, i)

                if in_zone:
                    accident_affected[i] = True
                elif approaching:
                    accident_approaching[i] = True

            # FIX_TASK2: Standard NaSch - accelerate, then limit by gap
            # Standard NaSch: accelerate, then limit by gap, then random slowdown
            v = np.minimum(lane.spd + 1, self.vmax[vt])  # 1. accelerate

            # ACCIDENT IMPACT: Enforce speed limits
            for i in range(lane.n):
                if accident_affected[i]:
                    # Strict speed limit in accident zone
                    v[i] = min(v[i], ACCIDENT_SPEED_LIMIT)
                elif accident_approaching[i]:
                    # Moderate speed limit when approaching
                    v[i] = min(v[i], ACCIDENT_APPROACH_SPEED)

            v = np.minimum(
                v, gap
            )  # 2. collision avoidance (speed limited by gap ahead)

            # FIX_TASK3 + OPTION 3: Vehicle recognition (skips vehicles in accident zones)
            # Vehicles recognize and respond to the vehicle ahead, except in accident zones
            v = self._adjust_speed_for_leader(lane, v, gap, accident_affected)

            # ACCIDENT SLOWDOWN: Higher slowdown probability near accidents
            # 3. random slowdown (base + accident-affected)
            pslow_effective = np.full(lane.n, self.pslow[vt[0]], dtype=float)
            for i in range(lane.n):
                if accident_affected[i]:
                    # Very high slowdown in accident zone (95%)
                    pslow_effective[i] = 0.95
                elif accident_approaching[i]:
                    # Moderate slowdown when approaching (60%)
                    pslow_effective[i] = 0.60

            slow = (self.rng.random(lane.n) < pslow_effective) & (v > 0)
            v = v - slow

            # FIX_TASK1: Removed minimum speed enforcement (line was: v = np.maximum(v, np.minimum(self.vmin[vt], gap)))
            # Standard NaSch allows vehicles to reach speed 0, especially at red lights
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
                # Calculate new positions in next lane
                new_positions = lane.pos[out] - lane.length

                # Add vehicles to next lane - the add() method will sort by position
                self.lanes[lane.next_id].add(
                    new_positions,
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
            # Only spawn if: random check passes AND (lane empty OR rear vehicle is far enough)
            # Need at least 2 cells gap to spawn safely (1 cell for vehicle + 1 cell gap)
            can_spawn = lane.n == 0 or lane.pos[0] >= 2
            if self.rng.random() < self.spawn_rate and can_spawn:
                vt = MOTO if self.rng.random() < self.moto_share else CAR
                lane.add([0], [0], [self.next_vid], [vt], [0])
                self.next_vid += 1

    # ---- output ----
    def _calculate_lane_segments(self, lane: LaneState) -> list[dict[str, Any]]:
        """TASK_SEGMENTED_CONGESTION: Calculate congestion for segments of a lane.

        Divides lane into fixed-size segments (SEGMENT_SIZE cells each) and computes
        congestion level per segment for Google Maps-style visualization.

        Congestion is determined by BOTH density AND average speed:
        - High density OR low speed → congestion
        - This makes accidents visible even with moderate vehicle counts

        Returns list of segments with start_cell, end_cell, level, density, vehicle_count.
        """
        segments = []

        for start_cell in range(0, lane.length, SEGMENT_SIZE):
            end_cell = min(start_cell + SEGMENT_SIZE, lane.length)

            # Get vehicles in this segment
            vehicles_in_segment_mask = (lane.pos >= start_cell) & (lane.pos < end_cell)
            vehicles_in_segment = vehicles_in_segment_mask.sum()

            # Calculate density for this segment
            segment_length = end_cell - start_cell
            density = (
                vehicles_in_segment / segment_length if segment_length > 0 else 0.0
            )

            # Calculate average speed in this segment
            if vehicles_in_segment > 0:
                segment_speeds = lane.spd[vehicles_in_segment_mask]
                avg_speed = segment_speeds.mean()

                # Get max possible speed in this segment (check vehicle types)
                segment_types = lane.vtype[vehicles_in_segment_mask]
                max_possible_speed = self.vmax[segment_types].mean()

                # Calculate speed ratio (0.0 = stopped, 1.0 = full speed)
                speed_ratio = (
                    avg_speed / max_possible_speed if max_possible_speed > 0 else 1.0
                )
            else:
                avg_speed = 0
                speed_ratio = 1.0  # No vehicles = no congestion

            # Determine congestion level based on BOTH density AND speed
            # If speed is very low, mark as congested even with low density
            if density >= MODERATE_MAX or speed_ratio < 0.3:
                # Heavy: high density OR very low speed (<30% of max)
                level = "heavy"  # Red
            elif density >= LIGHT_MAX or speed_ratio < 0.6:
                # Moderate: medium density OR low speed (<60% of max)
                level = "moderate"  # Orange
            else:
                # Light: low density AND normal speed
                level = "light"  # Green

            segments.append(
                {
                    "lane_id": lane.id,
                    "start_cell": start_cell,
                    "end_cell": end_cell,
                    "level": level,
                    "density": round(density, 3),
                    "vehicle_count": int(vehicles_in_segment),
                    "avg_speed": round(float(avg_speed), 2),  # Added for debugging
                }
            )

        return segments

    def snapshot(self) -> dict[str, Any]:
        vehicles: list[dict[str, Any]] = []
        congestion: list[dict[str, Any]] = []
        segments: list[dict[str, Any]] = []  # TASK_SEGMENTED_CONGESTION

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

            # TASK_SEGMENTED_CONGESTION: Calculate segment-level congestion
            segments.extend(self._calculate_lane_segments(lane))

        signals = [
            {
                "signal_id": sid,
                "leg_id": leg,
                "phase": self.signals.phase(sid, self.tick).value,
                "seconds_remaining": self.signals.seconds_remaining(sid, self.tick),
            }
            for leg, sid in LEG_SIGNAL.items()
        ]
        return {
            "vehicles": vehicles,
            "congestion": congestion,
            "segments": segments,  # TASK_SEGMENTED_CONGESTION: Add segments to output
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
