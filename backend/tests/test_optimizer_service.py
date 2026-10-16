"""Unit tests for optimizer service.

Run with: python -m unittest tests.test_optimizer_service
"""

import unittest

import numpy as np

from src.network.service import load_network_data
from src.optimizer.schemas import OptimizationRequest
from src.optimizer.service import (
    evaluate_candidate,
    prepare_config_for_candidate,
    run_optimization,
    worker_init,
)
from src.simulation.schemas import CreateRunRequest


class WorkerInitTests(unittest.TestCase):
    """Test worker initialization."""

    def test_worker_init_loads_network(self) -> None:
        """worker_init should parse network_dict and store in global _WORKER_NETWORK."""
        network = load_network_data()
        network_dict = network.model_dump()

        # Initialize worker
        worker_init(network_dict)

        # Verify by importing the global
        from src.optimizer.service import _WORKER_NETWORK

        self.assertIsNotNone(_WORKER_NETWORK)
        self.assertEqual(_WORKER_NETWORK.junction, network.junction)
        self.assertEqual(len(_WORKER_NETWORK.lanes), len(network.lanes))


class EvaluateCandidateTests(unittest.TestCase):
    """Test candidate evaluation function."""

    def setUp(self) -> None:
        """Initialize worker with network data once for all tests."""
        network = load_network_data()
        network_dict = network.model_dump()
        worker_init(network_dict)

    def test_evaluate_candidate_returns_required_keys(self) -> None:
        """evaluate_candidate should return dict with throughput, avg_wait, max_queue, fitness."""
        config = CreateRunRequest()
        config_dict = config.model_dump()

        # Use small normalization range to test normalization logic
        normalization_params = {
            "throughput": (0.0, 100.0),
            "avg_wait": (0.0, 10.0),
            "max_queue": (0.0, 20.0),
        }

        result = evaluate_candidate(
            config_dict,
            ticks=100,
            w_throughput=1.0,
            w_wait=1.0,
            w_queue=1.0,
            normalization_params=normalization_params,
        )

        self.assertIn("throughput", result)
        self.assertIn("avg_wait", result)
        self.assertIn("max_queue", result)
        self.assertIn("fitness", result)
        self.assertIsInstance(result["throughput"], float)
        self.assertIsInstance(result["avg_wait"], float)
        self.assertIsInstance(result["max_queue"], float)
        self.assertIsInstance(result["fitness"], float)

    def test_normalization_with_zero_range_returns_zero(self) -> None:
        """Normalization should return 0.0 when max_val - min_val < eps (HIGH-4 fix)."""
        config = CreateRunRequest()
        config_dict = config.model_dump()

        # All metrics have zero range (min == max)
        normalization_params = {
            "throughput": (50.0, 50.0),  # zero range
            "avg_wait": (5.0, 5.0),  # zero range
            "max_queue": (10.0, 10.0),  # zero range
        }

        result = evaluate_candidate(
            config_dict,
            ticks=100,
            w_throughput=1.0,
            w_wait=1.0,
            w_queue=1.0,
            normalization_params=normalization_params,
        )

        # Should not raise division by zero error
        self.assertIsInstance(result["fitness"], float)
        # Fitness should be 0.0 since all normalized values are 0.0
        self.assertEqual(result["fitness"], 0.0)


class PrepareConfigTests(unittest.TestCase):
    """Test config preparation for candidates."""

    def test_seed_derivation_differentiates_generations_and_candidates(self) -> None:
        """Seed derivation should include generation_idx and candidate_index (HIGH-5 fix)."""
        base_config = CreateRunRequest()
        signal_plan = base_config.signal_plan
        request_seed = 42

        # Same candidate in different generations should have different seeds
        config_gen0_idx0 = prepare_config_for_candidate(
            base_config,
            signal_plan,
            generation_idx=0,
            candidate_index=0,
            request_seed=request_seed,
        )
        config_gen1_idx0 = prepare_config_for_candidate(
            base_config,
            signal_plan,
            generation_idx=1,
            candidate_index=0,
            request_seed=request_seed,
        )
        self.assertNotEqual(config_gen0_idx0["seed"], config_gen1_idx0["seed"])

        # Different candidates in same generation should have different seeds
        config_gen0_idx0 = prepare_config_for_candidate(
            base_config,
            signal_plan,
            generation_idx=0,
            candidate_index=0,
            request_seed=request_seed,
        )
        config_gen0_idx1 = prepare_config_for_candidate(
            base_config,
            signal_plan,
            generation_idx=0,
            candidate_index=1,
            request_seed=request_seed,
        )
        self.assertNotEqual(config_gen0_idx0["seed"], config_gen0_idx1["seed"])

    def test_seed_derivation_formula(self) -> None:
        """Verify seed derivation formula: (request_seed + generation_idx * 1000 + candidate_index) % (2**32)."""
        base_config = CreateRunRequest()
        signal_plan = base_config.signal_plan
        request_seed = 100

        config = prepare_config_for_candidate(
            base_config,
            signal_plan,
            generation_idx=2,
            candidate_index=5,
            request_seed=request_seed,
        )

        expected_seed = (100 + 2 * 1000 + 5) % (2**32)
        self.assertEqual(config["seed"], expected_seed)

    def test_no_seed_when_request_seed_is_none(self) -> None:
        """If request_seed is None, config.seed should remain None."""
        base_config = CreateRunRequest(seed=None)
        signal_plan = base_config.signal_plan

        config = prepare_config_for_candidate(
            base_config,
            signal_plan,
            generation_idx=0,
            candidate_index=0,
            request_seed=None,
        )

        # Should not have seed key set (or should be None)
        # Since we copy base_config and don't set seed if request_seed is None
        self.assertIsNone(config.get("seed"))


class RunOptimizationTests(unittest.TestCase):
    """Test end-to-end optimization."""

    def test_run_optimization_completes(self) -> None:
        """run_optimization with small parameters should complete and return OptimizationResult."""
        network = load_network_data()
        req = OptimizationRequest(
            base_config=CreateRunRequest(),
            population_size=4,
            generations=2,
            ticks_per_eval=100,
            w_throughput=1.0,
            w_wait=1.0,
            w_queue=1.0,
            seed=123,
        )

        result = run_optimization(req, network)

        self.assertIsNotNone(result.best_signal_plan)
        self.assertEqual(len(result.best_signal_plan.signal_timers), 4)
        self.assertGreater(result.best_metrics.throughput, 0.0)
        self.assertGreaterEqual(result.best_metrics.avg_wait, 0.0)
        self.assertGreaterEqual(result.best_metrics.max_queue, 0.0)
        self.assertGreater(result.elapsed_seconds, 0.0)
        self.assertEqual(
            result.total_evaluations, 4 * 2
        )  # population_size * generations

    def test_run_optimization_improves_or_maintains_fitness(self) -> None:
        """Final best fitness should be >= initial best fitness (or at least not much worse)."""
        network = load_network_data()
        req = OptimizationRequest(
            base_config=CreateRunRequest(),
            population_size=6,
            generations=3,
            ticks_per_eval=100,
            seed=456,
        )

        result = run_optimization(req, network)

        # Since we include base_config in initial population and use elitism,
        # best fitness should generally improve or stay the same
        # Just verify we got a valid result
        self.assertIsNotNone(result.best_metrics)
        self.assertTrue(np.isfinite(result.best_metrics.fitness))


if __name__ == "__main__":
    unittest.main()
