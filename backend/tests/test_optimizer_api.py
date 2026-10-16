"""Integration tests for optimizer API endpoint.

Run with: python -m unittest tests.test_optimizer_api
"""

import unittest

from fastapi.testclient import TestClient
from src.main import app


class OptimizerAPITests(unittest.TestCase):
    """Integration tests for POST /optimization/optimize endpoint."""

    def test_optimize_endpoint_returns_valid_result(self) -> None:
        """Test that /optimization/optimize returns a valid OptimizationResult."""
        request_body = {
            "base_config": {
                "day_of_week": "wednesday",
                "time": "08:00:00",
                "weather_condition": "clear",
                "density_scenario": "moderate",
            },
            "population_size": 4,
            "generations": 2,
            "ticks_per_eval": 100,
            "w_throughput": 1.0,
            "w_wait": 1.0,
            "w_queue": 1.0,
        }

        with TestClient(app) as client:
            response = client.post("/optimization/optimize", json=request_body)

            # Assert successful response
            self.assertEqual(response.status_code, 200)

            # Parse response JSON
            result = response.json()

            # Assert structure and required fields
            self.assertIn("best_signal_plan", result)
            self.assertIn("best_metrics", result)
            self.assertIn("elapsed_seconds", result)
            self.assertIn("total_evaluations", result)

            # Validate best_signal_plan structure
            best_signal_plan = result["best_signal_plan"]
            self.assertIn("signal_timers", best_signal_plan)
            self.assertEqual(len(best_signal_plan["signal_timers"]), 4)

            # Validate each signal timer has required fields
            for timer in best_signal_plan["signal_timers"]:
                self.assertIn("signal_id", timer)
                self.assertIn("green", timer)
                self.assertIn("yellow", timer)
                self.assertIn("red", timer)
                # All durations should be positive integers
                self.assertGreater(timer["green"], 0)
                self.assertGreater(timer["yellow"], 0)
                self.assertGreater(timer["red"], 0)

            # Validate best_metrics structure
            best_metrics = result["best_metrics"]
            self.assertIn("throughput", best_metrics)
            self.assertIn("avg_wait", best_metrics)
            self.assertIn("max_queue", best_metrics)
            self.assertIn("fitness", best_metrics)

            # Validate metrics are valid numbers
            self.assertGreaterEqual(best_metrics["throughput"], 0.0)
            self.assertGreaterEqual(best_metrics["avg_wait"], 0.0)
            self.assertGreaterEqual(best_metrics["max_queue"], 0.0)

            # Validate elapsed_seconds is positive
            self.assertGreater(result["elapsed_seconds"], 0)

            # Validate total_evaluations matches expected (population_size * generations)
            self.assertEqual(result["total_evaluations"], 8)

    def test_optimize_endpoint_with_seed_is_reproducible(self) -> None:
        """Test that identical requests with same seed produce identical results."""
        request_body = {
            "base_config": {
                "day_of_week": "friday",
                "time": "17:00:00",
                "weather_condition": "clear",
                "density_scenario": "heavy",
            },
            "population_size": 4,
            "generations": 2,
            "ticks_per_eval": 100,
            "w_throughput": 1.0,
            "w_wait": 1.0,
            "w_queue": 1.0,
            "seed": 42,
        }

        with TestClient(app) as client:
            # Make two identical requests
            response1 = client.post("/optimization/optimize", json=request_body)
            response2 = client.post("/optimization/optimize", json=request_body)

            self.assertEqual(response1.status_code, 200)
            self.assertEqual(response2.status_code, 200)

            result1 = response1.json()
            result2 = response2.json()

            # Compare best_signal_plan signal_timers (should be identical)
            timers1 = result1["best_signal_plan"]["signal_timers"]
            timers2 = result2["best_signal_plan"]["signal_timers"]

            self.assertEqual(len(timers1), len(timers2))
            for t1, t2 in zip(timers1, timers2):
                self.assertEqual(t1["signal_id"], t2["signal_id"])
                self.assertEqual(t1["green"], t2["green"])
                self.assertEqual(t1["yellow"], t2["yellow"])
                self.assertEqual(t1["red"], t2["red"])

            # Compare metrics (should be identical with same seed)
            metrics1 = result1["best_metrics"]
            metrics2 = result2["best_metrics"]

            self.assertEqual(metrics1["throughput"], metrics2["throughput"])
            self.assertEqual(metrics1["avg_wait"], metrics2["avg_wait"])
            self.assertEqual(metrics1["max_queue"], metrics2["max_queue"])
            self.assertEqual(metrics1["fitness"], metrics2["fitness"])

    def test_optimize_endpoint_with_custom_weights(self) -> None:
        """Test optimization with custom weights favoring throughput."""
        request_body = {
            "base_config": {
                "day_of_week": "monday",
                "time": "12:00:00",
                "weather_condition": "clear",
                "density_scenario": "light",
            },
            "population_size": 4,
            "generations": 2,
            "ticks_per_eval": 100,
            "w_throughput": 2.0,  # Prioritize throughput
            "w_wait": 0.5,
            "w_queue": 0.5,
            "seed": 123,
        }

        with TestClient(app) as client:
            response = client.post("/optimization/optimize", json=request_body)

            self.assertEqual(response.status_code, 200)
            result = response.json()

            # Validate response structure
            self.assertIn("best_signal_plan", result)
            self.assertIn("best_metrics", result)
            self.assertEqual(result["total_evaluations"], 8)

    def test_optimize_endpoint_rejects_invalid_population_size(self) -> None:
        """Test that endpoint rejects population_size < 4."""
        request_body = {
            "base_config": {},
            "population_size": 2,  # Too small
            "generations": 2,
            "ticks_per_eval": 100,
        }

        with TestClient(app) as client:
            response = client.post("/optimization/optimize", json=request_body)

            # Should return 422 validation error
            self.assertEqual(response.status_code, 422)

    def test_optimize_endpoint_rejects_zero_weights(self) -> None:
        """Test that endpoint rejects all weights being zero."""
        request_body = {
            "base_config": {},
            "population_size": 4,
            "generations": 2,
            "ticks_per_eval": 100,
            "w_throughput": 0.0,
            "w_wait": 0.0,
            "w_queue": 0.0,
        }

        with TestClient(app) as client:
            response = client.post("/optimization/optimize", json=request_body)

            # Should return 422 validation error
            self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
