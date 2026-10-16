"""Unit tests for optimizer.engine module.

Run with: python -m unittest tests.test_optimizer_engine
"""

import unittest

import numpy as np
from src.optimizer.engine import (
    BOUNDS,
    GREEN_MAX,
    GREEN_MIN,
    RED_MAX,
    RED_MIN,
    YELLOW_MAX,
    YELLOW_MIN,
    crossover,
    genes_to_signal_plan,
    initialize_population,
    mutate,
    signal_plan_to_genes,
    tournament_select,
)
from src.simulation.schemas import SignalPlan, SignalTimer


class TestGeneConversion(unittest.TestCase):
    """Test gene-to-plan and plan-to-gene conversion functions."""

    def test_genes_to_signal_plan_produces_valid_plan(self) -> None:
        """genes_to_signal_plan should produce a SignalPlan with 4 timers S1-S4."""
        genes = np.array([30, 40, 50, 60, 5, 6, 7, 8, 20, 25, 30, 35], dtype=float)
        plan = genes_to_signal_plan(genes)

        self.assertIsInstance(plan, SignalPlan)
        self.assertEqual(len(plan.signal_timers), 4)

        signal_ids = {t.signal_id for t in plan.signal_timers}
        self.assertEqual(signal_ids, {"S1", "S2", "S3", "S4"})

        # Check that values are rounded and within bounds
        for timer in plan.signal_timers:
            self.assertGreaterEqual(timer.green, GREEN_MIN)
            self.assertLessEqual(timer.green, GREEN_MAX)
            self.assertGreaterEqual(timer.yellow, YELLOW_MIN)
            self.assertLessEqual(timer.yellow, YELLOW_MAX)
            self.assertGreaterEqual(timer.red, RED_MIN)
            self.assertLessEqual(timer.red, RED_MAX)

    def test_signal_plan_to_genes_raises_for_wrong_signal_ids(self) -> None:
        """signal_plan_to_genes should raise ValueError for invalid signal_ids."""
        # Missing S4
        bad_plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=30, yellow=5, red=20),
                SignalTimer(signal_id="S2", green=30, yellow=5, red=20),
                SignalTimer(signal_id="S3", green=30, yellow=5, red=20),
                SignalTimer(signal_id="S5", green=30, yellow=5, red=20),
            ]
        )
        with self.assertRaises(ValueError) as ctx:
            signal_plan_to_genes(bad_plan)
        self.assertIn("S1-S4", str(ctx.exception))

    def test_signal_plan_to_genes_round_trip(self) -> None:
        """genes -> plan -> genes should preserve values (within rounding)."""
        original_genes = np.array(
            [30.0, 40.0, 50.0, 60.0, 5.0, 6.0, 7.0, 8.0, 20.0, 25.0, 30.0, 35.0]
        )
        plan = genes_to_signal_plan(original_genes)
        restored_genes = signal_plan_to_genes(plan)

        # Check that values are close (within 0.5 due to rounding)
        np.testing.assert_allclose(restored_genes, original_genes, atol=0.5)

    def test_signal_plan_to_genes_sorts_by_signal_id(self) -> None:
        """signal_plan_to_genes should sort timers by signal_id before extraction."""
        # Create plan with timers in non-sorted order
        plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S3", green=50, yellow=7, red=30),
                SignalTimer(signal_id="S1", green=30, yellow=5, red=20),
                SignalTimer(signal_id="S4", green=60, yellow=8, red=35),
                SignalTimer(signal_id="S2", green=40, yellow=6, red=25),
            ]
        )
        genes = signal_plan_to_genes(plan)

        # Expected order: S1, S2, S3, S4
        expected = np.array([30, 40, 50, 60, 5, 6, 7, 8, 20, 25, 30, 35], dtype=float)
        np.testing.assert_array_equal(genes, expected)


class TestGAOperators(unittest.TestCase):
    """Test genetic algorithm operators (selection, crossover, mutation)."""

    def setUp(self) -> None:
        """Set up test fixtures."""
        self.rng = np.random.default_rng(42)

    def test_mutate_stays_within_bounds(self) -> None:
        """mutate should clip genes to parameter bounds after mutation."""
        genes = np.array([30, 40, 50, 60, 5, 6, 7, 8, 20, 25, 30, 35], dtype=float)

        # Run mutation 100 times to test stochastic behavior
        for _ in range(100):
            mutated = mutate(genes.copy(), self.rng)

            # Check all genes are within bounds
            for i, gene_val in enumerate(mutated):
                min_bound, max_bound = BOUNDS[i]
                self.assertGreaterEqual(
                    gene_val,
                    min_bound,
                    f"Gene {i} below min bound: {gene_val} < {min_bound}",
                )
                self.assertLessEqual(
                    gene_val,
                    max_bound,
                    f"Gene {i} above max bound: {gene_val} > {max_bound}",
                )

    def test_crossover_produces_offspring_different_from_parents(self) -> None:
        """crossover should produce two offspring, at least one different from parents."""
        parent1 = np.array([30, 40, 50, 60, 5, 6, 7, 8, 20, 25, 30, 35], dtype=float)
        parent2 = np.array([90, 80, 70, 60, 10, 9, 8, 7, 90, 80, 70, 60], dtype=float)

        # Children should not be identical to parents (unless crossover point is 0 or 12)
        # Run multiple times to ensure stochastic test passes
        all_identical = True
        for _ in range(10):
            c1, c2 = crossover(parent1, parent2, self.rng)
            if not (np.array_equal(c1, parent1) or np.array_equal(c1, parent2)) or not (
                np.array_equal(c2, parent1) or np.array_equal(c2, parent2)
            ):
                all_identical = False
                break

        self.assertFalse(
            all_identical, "Crossover should produce offspring different from parents"
        )

    def test_tournament_select_picks_from_population(self) -> None:
        """tournament_select should return an individual from the population."""
        population = [
            np.array([30, 40, 50, 60, 5, 6, 7, 8, 20, 25, 30, 35], dtype=float),
            np.array([40, 50, 60, 70, 6, 7, 8, 9, 25, 30, 35, 40], dtype=float),
            np.array([50, 60, 70, 80, 7, 8, 9, 10, 30, 35, 40, 45], dtype=float),
            np.array([60, 70, 80, 90, 8, 9, 10, 10, 35, 40, 45, 50], dtype=float),
        ]
        fitness = np.array([1.0, 2.0, 3.0, 4.0])

        selected = tournament_select(population, fitness, self.rng)

        # Selected individual should be one of the population members
        found = False
        for individual in population:
            if np.array_equal(selected, individual):
                found = True
                break

        self.assertTrue(found, "Selected individual should be from population")

    def test_tournament_select_favors_high_fitness(self) -> None:
        """tournament_select should tend to select higher fitness individuals."""
        population = [
            np.array([30, 40, 50, 60, 5, 6, 7, 8, 20, 25, 30, 35], dtype=float),
            np.array([40, 50, 60, 70, 6, 7, 8, 9, 25, 30, 35, 40], dtype=float),
            np.array([50, 60, 70, 80, 7, 8, 9, 10, 30, 35, 40, 45], dtype=float),
            np.array([60, 70, 80, 90, 8, 9, 10, 10, 35, 40, 45, 50], dtype=float),
        ]
        # Last individual has much higher fitness
        fitness = np.array([1.0, 1.0, 1.0, 100.0])

        # Run selection 20 times, expect best to be selected frequently
        selections = []
        for _ in range(20):
            selected = tournament_select(population, fitness, self.rng)
            # Check if it's the best individual
            if np.array_equal(selected, population[3]):
                selections.append(3)

        # Best individual should be selected more than 50% of the time with such high fitness
        self.assertGreater(
            len(selections),
            10,
            "Tournament selection should favor high-fitness individuals",
        )


class TestPopulationInitialization(unittest.TestCase):
    """Test population initialization."""

    def test_initialize_population_includes_base_plan(self) -> None:
        """initialize_population should include the base signal plan."""
        rng = np.random.default_rng(42)
        base_plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=30, yellow=5, red=30),
                SignalTimer(signal_id="S2", green=30, yellow=5, red=30),
                SignalTimer(signal_id="S3", green=30, yellow=5, red=30),
                SignalTimer(signal_id="S4", green=30, yellow=5, red=30),
            ]
        )

        population = initialize_population(10, base_plan, rng)

        self.assertEqual(len(population), 10)

        # Last individual should be the base plan
        base_genes = signal_plan_to_genes(base_plan)
        np.testing.assert_array_equal(population[-1], base_genes)

    def test_initialize_population_generates_random_candidates(self) -> None:
        """initialize_population should generate diverse random candidates."""
        rng = np.random.default_rng(42)
        base_plan = SignalPlan(
            signal_timers=[
                SignalTimer(signal_id="S1", green=30, yellow=5, red=30),
                SignalTimer(signal_id="S2", green=30, yellow=5, red=30),
                SignalTimer(signal_id="S3", green=30, yellow=5, red=30),
                SignalTimer(signal_id="S4", green=30, yellow=5, red=30),
            ]
        )

        population = initialize_population(10, base_plan, rng)

        # Check that not all individuals are identical (first 9 should be random)
        all_identical = True
        for i in range(len(population) - 2):
            if not np.array_equal(population[i], population[i + 1]):
                all_identical = False
                break

        self.assertFalse(
            all_identical, "Population should contain diverse random candidates"
        )


if __name__ == "__main__":
    unittest.main()
