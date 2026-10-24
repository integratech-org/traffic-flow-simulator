import unittest

from src.network.schemas import Network
from src.network.service import load_network_data
from src.simulation.schemas import CreateRunRequest, SignalPlan, SignalTimer
from src.simulation.service import create_run, update_signal_plan


class UpdateSignalPlanTests(unittest.TestCase):
    """Tests for update_signal_plan function."""

    network: Network  # Type annotation for class attribute

    @classmethod
    def setUpClass(cls) -> None:
        """Load network once for all tests."""
        network = load_network_data()
        if network is None:
            raise RuntimeError("Failed to load network data")
        cls.network = network

    def test_update_signal_plan_updates_config(self) -> None:
        """update_signal_plan should update run.config.signal_plan."""
        run = create_run(CreateRunRequest(), self.network)
        original_green = run.config.signal_plan.signal_timers[0].green

        new_plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=45, yellow=5, red=30),
                SignalTimer(signal_id="S2", green=45, yellow=5, red=30),
                SignalTimer(signal_id="S3", green=45, yellow=5, red=30),
                SignalTimer(signal_id="S4", green=45, yellow=5, red=30),
            ]
        )

        updated_run = update_signal_plan(run, new_plan)

        # Verify config was updated
        self.assertNotEqual(
            updated_run.config.signal_plan.signal_timers[0].green, original_green
        )
        self.assertEqual(updated_run.config.signal_plan.signal_timers[0].green, 45)
        self.assertEqual(updated_run.config.signal_plan.signal_timers[1].green, 45)

    def test_update_signal_plan_updates_engine_if_started(self) -> None:
        """update_signal_plan should call engine.set_signal_plan if engine exists."""
        run = create_run(CreateRunRequest(), self.network)
        # Engine is already created in create_run, we can test directly

        new_plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=60, yellow=6, red=40),
                SignalTimer(signal_id="S2", green=60, yellow=6, red=40),
                SignalTimer(signal_id="S3", green=60, yellow=6, red=40),
                SignalTimer(signal_id="S4", green=60, yellow=6, red=40),
            ]
        )

        updated_run = update_signal_plan(run, new_plan)

        # Verify engine's signal controller was updated
        self.assertIsNotNone(updated_run.engine)
        # Type narrowing for mypy
        if updated_run.engine is not None:
            # In sequential mode, verify the phase schedule was built correctly
            self.assertIn("S1", updated_run.engine.signals.phase_schedule)
            self.assertIn("S2", updated_run.engine.signals.phase_schedule)
            self.assertEqual(
                updated_run.engine.signals.signal_timings["S1"], (60, 6, 40)
            )

    def test_update_signal_plan_before_start(self) -> None:
        """update_signal_plan should work even if engine is not initialized yet."""
        run = create_run(CreateRunRequest(), self.network)

        # Manually set engine to None to simulate pre-start state
        # (In real scenario, engine is always created in create_run, but we test the None check)
        original_engine = run.engine
        run.engine = None

        new_plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=50, yellow=4, red=35),
                SignalTimer(signal_id="S2", green=50, yellow=4, red=35),
                SignalTimer(signal_id="S3", green=50, yellow=4, red=35),
                SignalTimer(signal_id="S4", green=50, yellow=4, red=35),
            ]
        )

        # Should not raise an error even though engine is None
        updated_run = update_signal_plan(run, new_plan)

        # Config should still be updated
        self.assertEqual(updated_run.config.signal_plan.signal_timers[0].green, 50)
        self.assertIsNone(updated_run.engine)

        # Restore engine for cleanup
        run.engine = original_engine


if __name__ == "__main__":
    unittest.main()
