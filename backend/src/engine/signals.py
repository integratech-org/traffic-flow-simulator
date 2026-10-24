from enum import Enum

from src.simulation.schemas import SignalPlan


class Phase(str, Enum):
    green = "green"
    yellow = "yellow"
    red = "red"


# Sequential signal order: one direction at a time
# S1 (North) → S2 (South) → S3 (East) → S4 (West) → repeat
SIGNAL_ORDER = ["S1", "S2", "S3", "S4"]

# All-red clearance time between phases (safety buffer)
ALL_RED_CLEARANCE = 3  # seconds


class SignalController:
    """Sequential 4-way intersection signal controller.

    Only ONE direction can be green at a time (one-at-a-time sequential control).
    Each signal gets its turn: green → yellow → all-red clearance → next signal's turn.

    Cycle structure:
    1. S1 (North): GREEN → YELLOW → RED (+ clearance)
    2. S2 (South): GREEN → YELLOW → RED (+ clearance)
    3. S3 (East): GREEN → YELLOW → RED (+ clearance)
    4. S4 (West): GREEN → YELLOW → RED (+ clearance)
    5. Repeat
    """

    def __init__(self, plan: SignalPlan):
        self.set_plan(plan)

    def set_plan(self, plan: SignalPlan) -> None:
        """Configure signal timings for sequential one-at-a-time operation.

        Each signal gets its own time slot in sequence. Only one signal
        can be green at any given time.
        """
        # Create a map of signal_id → timings
        self.signal_timings: dict[str, tuple[int, int, int]] = {}
        for timer in plan.signal_timers:
            self.signal_timings[timer.signal_id] = (
                timer.green,
                timer.yellow,
                timer.red,  # Not used in sequential mode, but stored for reference
            )

        # For cycle calculation, use the timings from each signal
        # Calculate when each signal's phase starts
        self.phase_schedule: dict[str, dict[str, int]] = {}
        current_time = 0

        for signal_id in SIGNAL_ORDER:
            green, yellow, _ = self.signal_timings.get(
                signal_id, (30, 5, 30)
            )  # default fallback

            self.phase_schedule[signal_id] = {
                "green_start": current_time,
                "yellow_start": current_time + green,
                "red_start": current_time + green + yellow,
                "phase_end": current_time + green + yellow + ALL_RED_CLEARANCE,
            }

            current_time += green + yellow + ALL_RED_CLEARANCE

        # Total cycle length is sum of all signal phases plus clearances
        self.cycle_length = current_time

    def _get_cycle_position(self, tick: int) -> int:
        """Get position within the signal cycle (0 to cycle_length-1)."""
        return tick % self.cycle_length

    def phase(self, signal_id: str, tick: int) -> Phase:
        """Determine current phase for a signal.

        Only the signal whose time slot it is can be green or yellow.
        All other signals are red.
        """
        if signal_id not in self.phase_schedule:
            # Fallback for unknown signals
            return Phase.red

        schedule = self.phase_schedule[signal_id]
        t = self._get_cycle_position(tick)

        # Check which phase this specific signal is in
        if schedule["green_start"] <= t < schedule["yellow_start"]:
            return Phase.green
        elif schedule["yellow_start"] <= t < schedule["red_start"]:
            return Phase.yellow
        else:
            # All other times, this signal is red
            return Phase.red

    def can_pass(self, signal_id: str, tick: int) -> bool:
        """Only green phase allows passing (yellow = stop)."""
        return self.phase(signal_id, tick) == Phase.green

    def seconds_remaining(self, signal_id: str, tick: int) -> int:
        """Calculate seconds remaining in current phase."""
        if signal_id not in self.phase_schedule:
            return 0

        schedule = self.phase_schedule[signal_id]
        t = self._get_cycle_position(tick)

        # Determine current phase and calculate remaining time
        if schedule["green_start"] <= t < schedule["yellow_start"]:
            # In green phase
            return schedule["yellow_start"] - t
        elif schedule["yellow_start"] <= t < schedule["red_start"]:
            # In yellow phase
            return schedule["red_start"] - t
        else:
            # In red phase - calculate time until next green
            if t < schedule["green_start"]:
                # Before this signal's turn in current cycle
                return schedule["green_start"] - t
            else:
                # After this signal's turn, wait for next cycle
                return self.cycle_length - t + schedule["green_start"]
