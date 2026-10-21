from enum import Enum

from src.simulation.schemas import SignalPlan


class Phase(str, Enum):
    green = "green"
    yellow = "yellow"
    red = "red"


# Real-world intersection configuration:
# Opposing pairs can be green simultaneously (safe)
# Conflicting directions must never be green together
SIGNAL_GROUPS = {
    "mindanao": ["S1", "S3"],  # Mindanao SW and NE (opposing pair)
    "commonwealth": ["S2", "S4"],  # Commonwealth SW and NE (opposing pair)
}

# All-red clearance time between phases (safety buffer)
ALL_RED_CLEARANCE = 3  # seconds


class SignalController:
    """Real-world 4-way intersection signal controller.

    Coordinates signals so opposing pairs (e.g., North-South) can be green together,
    but conflicting directions (e.g., North-South vs East-West) are never both green.

    Cycle structure:
    1. Mindanao pair (S1+S3): GREEN → YELLOW → RED
    2. All-red clearance (3 seconds)
    3. Commonwealth pair (S2+S4): GREEN → YELLOW → RED
    4. All-red clearance (3 seconds)
    5. Repeat
    """

    def __init__(self, plan: SignalPlan):
        self.set_plan(plan)

    def set_plan(self, plan: SignalPlan) -> None:
        """Configure signal timings with opposing-pair coordination.

        For a 4-way intersection, we use 2 signal groups (opposing pairs).
        Each group cycles: green → yellow → all-red → (other group's turn)
        """
        # Extract timings from first signal (assume all have same durations)
        # In real implementation, could average or use per-group timings
        sample_timer = plan.signal_timers[0]
        self.green_duration = sample_timer.green
        self.yellow_duration = sample_timer.yellow

        # Calculate cycle length for one complete rotation
        # Phase 1: Mindanao green+yellow
        # Phase 2: All-red clearance
        # Phase 3: Commonwealth green+yellow
        # Phase 4: All-red clearance
        phase_duration = self.green_duration + self.yellow_duration
        self.cycle_length = 2 * (phase_duration + ALL_RED_CLEARANCE)

        # Store which signals belong to which group
        self.signal_to_group: dict[str, str] = {}
        for group_name, signal_ids in SIGNAL_GROUPS.items():
            for signal_id in signal_ids:
                self.signal_to_group[signal_id] = group_name

        # Phase start times within cycle
        self.phase_schedule = {
            "mindanao": {
                "green_start": 0,
                "yellow_start": self.green_duration,
                "red_start": self.green_duration + self.yellow_duration,
                "red_end": phase_duration + ALL_RED_CLEARANCE,
            },
            "commonwealth": {
                "green_start": phase_duration + ALL_RED_CLEARANCE,
                "yellow_start": phase_duration
                + ALL_RED_CLEARANCE
                + self.green_duration,
                "red_start": phase_duration
                + ALL_RED_CLEARANCE
                + self.green_duration
                + self.yellow_duration,
                "red_end": self.cycle_length,
            },
        }

    def _get_cycle_position(self, tick: int) -> int:
        """Get position within the signal cycle (0 to cycle_length-1)."""
        return tick % self.cycle_length

    def phase(self, signal_id: str, tick: int) -> Phase:
        """Determine current phase for a signal based on its group."""
        group = self.signal_to_group.get(signal_id)
        if not group:
            # Fallback for unknown signals
            return Phase.red

        schedule = self.phase_schedule[group]
        t = self._get_cycle_position(tick)

        # Check which phase we're in for this group
        if schedule["green_start"] <= t < schedule["yellow_start"]:
            return Phase.green
        elif schedule["yellow_start"] <= t < schedule["red_start"]:
            return Phase.yellow
        else:
            # Everything else is red (including all-red clearance and other group's turn)
            return Phase.red

    def can_pass(self, signal_id: str, tick: int) -> bool:
        """Only green phase allows passing (yellow = stop)."""
        return self.phase(signal_id, tick) == Phase.green

    def seconds_remaining(self, signal_id: str, tick: int) -> int:
        """Calculate seconds remaining in current phase."""
        group = self.signal_to_group.get(signal_id)
        if not group:
            return 0

        schedule = self.phase_schedule[group]
        t = self._get_cycle_position(tick)

        # Determine current phase and calculate remaining time
        if schedule["green_start"] <= t < schedule["yellow_start"]:
            # In green phase
            return schedule["yellow_start"] - t
        elif schedule["yellow_start"] <= t < schedule["red_start"]:
            # In yellow phase
            return schedule["red_start"] - t
        else:
            # In red phase - return time until next green
            if t < schedule["green_start"]:
                # Before this group's green in current cycle
                return schedule["green_start"] - t
            else:
                # After this group's turn, wait for next cycle
                return self.cycle_length - t + schedule["green_start"]
