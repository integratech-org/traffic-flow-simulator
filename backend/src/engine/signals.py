from enum import Enum

from src.simulation.schemas import SignalPlan


class Phase(str, Enum):
    green = "green"
    yellow = "yellow"
    red = "red"


class SignalController:
    """Stateless FSM: the phase is computed from the tick, so changing the
    plan mid-run takes effect immediately."""

    def __init__(self, plan: SignalPlan):
        self.set_plan(plan)

    def set_plan(self, plan: SignalPlan) -> None:
        # Staggered starts: signal i turns green when signal i-1 finishes yellow
        self.timers: dict[str, tuple[int, int, int, int]] = {}
        start = 0
        for s in plan.signal_timers:
            self.timers[s.signal_id] = (s.green, s.yellow, s.red, start)
            start += s.green + s.yellow

    def phase(self, signal_id: str, tick: int) -> Phase:
        green, yellow, red, start = self.timers[signal_id]
        t = (tick - start) % (green + yellow + red)
        if t < green:
            return Phase.green
        if t < green + yellow:
            return Phase.yellow
        return Phase.red

    def can_pass(self, signal_id: str, tick: int) -> bool:
        return self.phase(signal_id, tick) == Phase.green  # yellow = stop

    def seconds_remaining(self, signal_id: str, tick: int) -> int:
        """Calculate seconds remaining in current phase."""
        green, yellow, red, start = self.timers[signal_id]
        cycle_length = green + yellow + red
        t = (tick - start) % cycle_length

        if t < green:
            # In green phase
            return green - t
        elif t < green + yellow:
            # In yellow phase
            return (green + yellow) - t
        else:
            # In red phase
            return cycle_length - t
