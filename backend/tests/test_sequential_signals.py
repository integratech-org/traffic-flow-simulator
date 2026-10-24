"""Unit tests for sequential signal controller (one-at-a-time mode).

Run with: python -m unittest tests.test_sequential_signals
"""

import unittest

from src.engine.signals import Phase, SignalController
from src.simulation.schemas import SignalPlan, SignalTimer


class SequentialSignalTests(unittest.TestCase):
    """Tests for sequential signal controller behavior."""

    def test_only_one_signal_green_at_a_time(self) -> None:
        """Verify that only ONE signal can be green at any given tick."""
        plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=30, yellow=5, red=30),
                SignalTimer(signal_id="S2", green=30, yellow=5, red=30),
                SignalTimer(signal_id="S3", green=30, yellow=5, red=30),
                SignalTimer(signal_id="S4", green=30, yellow=5, red=30),
            ]
        )
        controller = SignalController(plan)

        # Test across multiple cycles
        for tick in range(controller.cycle_length * 2):
            green_signals = []
            for signal_id in ["S1", "S2", "S3", "S4"]:
                if controller.phase(signal_id, tick) == Phase.green:
                    green_signals.append(signal_id)

            # At most ONE signal should be green
            self.assertLessEqual(
                len(green_signals),
                1,
                f"Tick {tick}: Multiple signals green: {green_signals}",
            )

    def test_signal_sequence_order(self) -> None:
        """Verify signals turn green in order: S1 → S2 → S3 → S4."""
        plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=20, yellow=3, red=20),
                SignalTimer(signal_id="S2", green=20, yellow=3, red=20),
                SignalTimer(signal_id="S3", green=20, yellow=3, red=20),
                SignalTimer(signal_id="S4", green=20, yellow=3, red=20),
            ]
        )
        controller = SignalController(plan)

        # Track when each signal first turns green in a cycle
        green_times = {}
        for tick in range(controller.cycle_length):
            for signal_id in ["S1", "S2", "S3", "S4"]:
                if (
                    controller.phase(signal_id, tick) == Phase.green
                    and signal_id not in green_times
                ):
                    green_times[signal_id] = tick

        # Verify order: S1 before S2 before S3 before S4
        self.assertLess(green_times["S1"], green_times["S2"])
        self.assertLess(green_times["S2"], green_times["S3"])
        self.assertLess(green_times["S3"], green_times["S4"])

    def test_all_red_clearance_between_signals(self) -> None:
        """Verify there's an all-red clearance period between each signal's turn."""
        plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=10, yellow=2, red=10),
                SignalTimer(signal_id="S2", green=10, yellow=2, red=10),
                SignalTimer(signal_id="S3", green=10, yellow=2, red=10),
                SignalTimer(signal_id="S4", green=10, yellow=2, red=10),
            ]
        )
        controller = SignalController(plan)

        # Find clearance periods (when all signals are red)
        clearance_periods = []
        for tick in range(controller.cycle_length):
            all_red = all(
                controller.phase(signal_id, tick) == Phase.red
                for signal_id in ["S1", "S2", "S3", "S4"]
            )
            if all_red:
                clearance_periods.append(tick)

        # Should have at least some clearance periods
        self.assertGreater(
            len(clearance_periods), 0, "Expected all-red clearance periods"
        )

    def test_each_signal_gets_green_phase(self) -> None:
        """Verify every signal gets a green phase in each cycle."""
        plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=15, yellow=3, red=15),
                SignalTimer(signal_id="S2", green=20, yellow=3, red=20),
                SignalTimer(signal_id="S3", green=25, yellow=3, red=25),
                SignalTimer(signal_id="S4", green=30, yellow=3, red=30),
            ]
        )
        controller = SignalController(plan)

        # Track which signals get green in one cycle
        signals_with_green = set()
        for tick in range(controller.cycle_length):
            for signal_id in ["S1", "S2", "S3", "S4"]:
                if controller.phase(signal_id, tick) == Phase.green:
                    signals_with_green.add(signal_id)

        # All four signals should have had green
        self.assertEqual(signals_with_green, {"S1", "S2", "S3", "S4"})

    def test_green_duration_respected(self) -> None:
        """Verify each signal's green duration is respected."""
        plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=15, yellow=3, red=20),
                SignalTimer(signal_id="S2", green=25, yellow=3, red=20),
                SignalTimer(signal_id="S3", green=20, yellow=3, red=20),
                SignalTimer(signal_id="S4", green=30, yellow=3, red=20),
            ]
        )
        controller = SignalController(plan)

        # Count green ticks for each signal in one cycle
        green_counts = {"S1": 0, "S2": 0, "S3": 0, "S4": 0}
        for tick in range(controller.cycle_length):
            for signal_id in ["S1", "S2", "S3", "S4"]:
                if controller.phase(signal_id, tick) == Phase.green:
                    green_counts[signal_id] += 1

        # Verify green durations match configuration
        self.assertEqual(green_counts["S1"], 15)
        self.assertEqual(green_counts["S2"], 25)
        self.assertEqual(green_counts["S3"], 20)
        self.assertEqual(green_counts["S4"], 30)

    def test_can_pass_only_during_green(self) -> None:
        """Verify can_pass returns True only during green phase."""
        plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=20, yellow=5, red=20),
                SignalTimer(signal_id="S2", green=20, yellow=5, red=20),
                SignalTimer(signal_id="S3", green=20, yellow=5, red=20),
                SignalTimer(signal_id="S4", green=20, yellow=5, red=20),
            ]
        )
        controller = SignalController(plan)

        for tick in range(controller.cycle_length):
            for signal_id in ["S1", "S2", "S3", "S4"]:
                can_pass = controller.can_pass(signal_id, tick)
                phase = controller.phase(signal_id, tick)

                if can_pass:
                    # If can_pass is True, phase must be green
                    self.assertEqual(phase, Phase.green)
                else:
                    # If can_pass is False, phase must NOT be green
                    self.assertNotEqual(phase, Phase.green)

    def test_cycle_repeats(self) -> None:
        """Verify the signal cycle repeats correctly."""
        plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=10, yellow=2, red=10),
                SignalTimer(signal_id="S2", green=10, yellow=2, red=10),
                SignalTimer(signal_id="S3", green=10, yellow=2, red=10),
                SignalTimer(signal_id="S4", green=10, yellow=2, red=10),
            ]
        )
        controller = SignalController(plan)

        # Record phases in first cycle
        first_cycle = {}
        for tick in range(controller.cycle_length):
            first_cycle[tick] = {
                signal_id: controller.phase(signal_id, tick)
                for signal_id in ["S1", "S2", "S3", "S4"]
            }

        # Compare with second cycle
        for tick in range(controller.cycle_length):
            second_cycle_tick = tick + controller.cycle_length
            for signal_id in ["S1", "S2", "S3", "S4"]:
                phase_first = first_cycle[tick][signal_id]
                phase_second = controller.phase(signal_id, second_cycle_tick)
                self.assertEqual(
                    phase_first,
                    phase_second,
                    f"Cycle mismatch at tick {tick} for {signal_id}",
                )


if __name__ == "__main__":
    unittest.main()
