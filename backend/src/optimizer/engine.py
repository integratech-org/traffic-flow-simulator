"""Genetic algorithm engine for traffic signal optimization."""

import numpy as np

from src.simulation.schemas import SignalPlan, SignalTimer

# Parameter bounds for signal timings (seconds)
GREEN_MIN = 10
GREEN_MAX = 90
YELLOW_MIN = 3
YELLOW_MAX = 10
RED_MIN = 10
RED_MAX = 90

# Bounds list for mutation (indexed by gene position)
BOUNDS = (
    [(GREEN_MIN, GREEN_MAX)] * 4  # genes 0-3: green times for S1-S4
    + [(YELLOW_MIN, YELLOW_MAX)] * 4  # genes 4-7: yellow times for S1-S4
    + [(RED_MIN, RED_MAX)] * 4  # genes 8-11: red times for S1-S4
)


def genes_to_signal_plan(genes: np.ndarray) -> SignalPlan:
    """Convert 12-element gene array to a SignalPlan with 4 SignalTimers.

    Args:
        genes: Array of 12 floats representing [greens(4), yellows(4), reds(4)].

    Returns:
        SignalPlan with 4 SignalTimer objects (S1, S2, S3, S4).
    """
    timers = []
    for i in range(4):
        timers.append(
            SignalTimer(
                signal_id=f"S{i + 1}",
                green=int(np.clip(np.round(genes[i]), GREEN_MIN, GREEN_MAX)),
                yellow=int(np.clip(np.round(genes[4 + i]), YELLOW_MIN, YELLOW_MAX)),
                red=int(np.clip(np.round(genes[8 + i]), RED_MIN, RED_MAX)),
            )
        )
    return SignalPlan(signal_timers=timers)


def signal_plan_to_genes(signal_plan: SignalPlan) -> np.ndarray:
    """Convert a SignalPlan to a 12-element gene array.

    Args:
        signal_plan: SignalPlan with 4 SignalTimer objects.

    Returns:
        Array of 12 floats representing [greens(4), yellows(4), reds(4)].

    Raises:
        ValueError: If signal_plan does not contain exactly S1, S2, S3, S4.

    Note:
        MEDIUM-2: signal_timers are sorted by signal_id before extraction to ensure
        consistent order (S1, S2, S3, S4) regardless of input order.
    """
    # Validate signal IDs
    expected = {"S1", "S2", "S3", "S4"}
    actual = {t.signal_id for t in signal_plan.signal_timers}
    if actual != expected:
        raise ValueError(f"signal_plan must contain S1-S4, got {actual}")

    # Sort timers by signal_id to ensure consistent gene order
    sorted_timers = sorted(signal_plan.signal_timers, key=lambda t: t.signal_id)

    genes = np.zeros(12)
    for i, timer in enumerate(sorted_timers):
        genes[i] = float(timer.green)
        genes[4 + i] = float(timer.yellow)
        genes[8 + i] = float(timer.red)
    return genes


def initialize_population(
    population_size: int, base_signal_plan: SignalPlan, rng: np.random.Generator
) -> list[np.ndarray]:
    """Initialize a population with random candidates plus the base signal plan.

    Args:
        population_size: Number of individuals in the population.
        base_signal_plan: Baseline signal plan to include as one candidate.
        rng: NumPy random generator for reproducibility.

    Returns:
        List of gene arrays (each is a 12-element np.ndarray).
    """
    population = []

    # Generate N-1 random candidates (uniform within bounds per gene)
    for _ in range(population_size - 1):
        individual = np.concatenate(
            [
                rng.uniform(GREEN_MIN, GREEN_MAX, size=4),  # greens for S1-S4
                rng.uniform(YELLOW_MIN, YELLOW_MAX, size=4),  # yellows for S1-S4
                rng.uniform(RED_MIN, RED_MAX, size=4),  # reds for S1-S4
            ]
        )
        population.append(individual)

    # Always include base_signal_plan as one candidate for comparison
    base_genes = signal_plan_to_genes(base_signal_plan)
    population.append(base_genes)

    return population


def tournament_select(
    population: list[np.ndarray], fitness: np.ndarray, rng: np.random.Generator
) -> np.ndarray:
    """Select a parent using tournament selection (size=3, without replacement).

    Args:
        population: List of gene arrays.
        fitness: Array of fitness scores (one per individual).
        rng: NumPy random generator.

    Returns:
        Copy of the selected individual's genes.
    """
    tournament_indices = rng.choice(len(population), size=3, replace=False)
    winner_idx = tournament_indices[np.argmax(fitness[tournament_indices])]
    return population[winner_idx].copy()


def crossover(
    parent1: np.ndarray, parent2: np.ndarray, rng: np.random.Generator
) -> tuple[np.ndarray, np.ndarray]:
    """Apply single-point crossover to two parents.

    Args:
        parent1: First parent gene array.
        parent2: Second parent gene array.
        rng: NumPy random generator.

    Returns:
        Tuple of two offspring gene arrays.
    """
    crossover_point = rng.integers(0, 12)  # Uniform random in [0, 12)
    child1 = np.concatenate([parent1[:crossover_point], parent2[crossover_point:]])
    child2 = np.concatenate([parent2[:crossover_point], parent1[crossover_point:]])
    return child1, child2


def mutate(genes: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Apply Gaussian mutation to genes with clipping to bounds.

    Args:
        genes: Gene array to mutate (modified in-place).
        rng: NumPy random generator.

    Returns:
        The mutated gene array (same object as input).
    """
    p_mutation = 0.15  # Probability of mutation per gene

    for i in range(12):
        if rng.random() < p_mutation:
            param_range = BOUNDS[i][1] - BOUNDS[i][0]
            noise = rng.normal(0, param_range * 0.1)  # Gaussian sigma = 10% of range
            genes[i] = np.clip(genes[i] + noise, BOUNDS[i][0], BOUNDS[i][1])

    return genes
