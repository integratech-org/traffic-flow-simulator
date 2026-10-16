"""Optimization service with parallel fitness evaluation using ProcessPoolExecutor."""

import logging
import multiprocessing
import time
from concurrent.futures import ProcessPoolExecutor, TimeoutError
from concurrent.futures.process import BrokenProcessPool

import numpy as np
from fastapi import HTTPException

from src.engine.engine import TrafficEngine
from src.network.schemas import Network
from src.optimizer.engine import (
    crossover,
    genes_to_signal_plan,
    initialize_population,
    mutate,
    tournament_select,
)
from src.optimizer.schemas import (
    CandidateMetrics,
    OptimizationRequest,
    OptimizationResult,
)
from src.simulation.schemas import CreateRunRequest

EVAL_TIMEOUT_SECONDS = 30

logger = logging.getLogger(__name__)

# MEDIUM-3: Type annotation for module-level worker state
_WORKER_NETWORK: Network | None = None


def worker_init(network_dict: dict[str, object]) -> None:
    """Initialize worker process with network data (called once per worker).

    Args:
        network_dict: Serialized network data (from Network.model_dump()).
    """
    global _WORKER_NETWORK
    _WORKER_NETWORK = Network.model_validate(network_dict)


def evaluate_candidate_raw(
    config_dict: dict[str, object], ticks: int
) -> dict[str, float]:
    """Evaluate a candidate and return raw metrics (no normalization).

    Args:
        config_dict: Serialized CreateRunRequest (with candidate signal plan).
        ticks: Number of simulation ticks to run.

    Returns:
        Dict with keys: throughput, avg_wait, max_queue (raw values, no fitness).
    """
    # Use module-level _WORKER_NETWORK (read-only access, no assignment)
    if _WORKER_NETWORK is None:
        raise RuntimeError("Worker not initialized with network data")

    config = CreateRunRequest.model_validate(config_dict)
    engine = TrafficEngine(_WORKER_NETWORK, config)

    # Run simulation
    for _ in range(ticks):
        engine.step()

    metrics = engine.metrics()

    return {
        "throughput": float(metrics["throughput"]),
        "avg_wait": float(metrics["avg_wait"]),
        "max_queue": float(metrics["max_queue"]),
    }


def evaluate_candidate(
    config_dict: dict[str, object],
    ticks: int,
    w_throughput: float,
    w_wait: float,
    w_queue: float,
    normalization_params: dict[str, tuple[float, float]],
) -> dict[str, float]:
    """Evaluate a single candidate configuration in a worker process.

    Args:
        config_dict: Serialized CreateRunRequest (with candidate signal plan).
        ticks: Number of simulation ticks to run.
        w_throughput: Weight for throughput (maximize).
        w_wait: Weight for average wait time (minimize).
        w_queue: Weight for maximum queue length (minimize).
        normalization_params: Dict mapping metric name to (min, max) tuple for normalization.

    Returns:
        Dict with keys: throughput, avg_wait, max_queue, fitness.
    """
    # Get raw metrics
    raw_metrics = evaluate_candidate_raw(config_dict, ticks)

    # Normalize metrics
    def normalize(value: float, metric_name: str) -> float:
        """Normalize a metric value to [0, 1] using generation-wide min/max.

        HIGH-4: Check for zero range and return 0.0 directly (NO '+ eps' in divisor).
        """
        min_val, max_val = normalization_params[metric_name]
        eps = 1e-9
        if max_val - min_val < eps:
            return 0.0
        return (value - min_val) / (max_val - min_val)

    norm_throughput = normalize(raw_metrics["throughput"], "throughput")
    norm_wait = normalize(raw_metrics["avg_wait"], "avg_wait")
    norm_queue = normalize(raw_metrics["max_queue"], "max_queue")

    # Compute fitness (maximize throughput, minimize wait and queue)
    fitness = w_throughput * norm_throughput - w_wait * norm_wait - w_queue * norm_queue

    # MEDIUM-4: Negative fitness is valid and expected when wait/queue penalties dominate.
    # The GA maximizes fitness regardless of sign, so a negative value simply indicates
    # that this candidate's wait/queue costs exceed its throughput benefit.

    return {
        "throughput": raw_metrics["throughput"],
        "avg_wait": raw_metrics["avg_wait"],
        "max_queue": raw_metrics["max_queue"],
        "fitness": float(fitness),
    }


def prepare_config_for_candidate(
    base_config: CreateRunRequest,
    signal_plan: object,
    generation_idx: int,
    candidate_index: int,
    request_seed: int | None,
) -> dict[str, object]:
    """Prepare a config dict for a candidate evaluation.

    Args:
        base_config: Base simulation configuration.
        signal_plan: Signal plan for this candidate.
        generation_idx: Current generation index (0-indexed).
        candidate_index: Candidate index within the population (0-indexed).
        request_seed: Seed from the optimization request (None if not provided).

    Returns:
        Serialized config dict ready for worker evaluation.
    """
    config = base_config.model_copy(update={"signal_plan": signal_plan})

    # HIGH-5: Seed derivation includes generation_idx to differentiate generations
    if request_seed is not None:
        config.seed = (request_seed + generation_idx * 1000 + candidate_index) % (2**32)

    return config.model_dump()


def run_optimization(
    req: OptimizationRequest, network_data: Network
) -> OptimizationResult:
    """Run genetic algorithm optimization for traffic signal timings.

    Args:
        req: Optimization request with GA parameters and base config.
        network_data: Network topology and lane data.

    Returns:
        OptimizationResult with best signal plan and metrics.

    Raises:
        HTTPException: If initial population is uniform or if too many evaluations fail.
    """
    start_time = time.time()
    rng = np.random.default_rng(req.seed)

    # Initialize population
    initial_population = initialize_population(
        req.population_size, req.base_config.signal_plan, rng
    )
    population = initial_population.copy()

    # Serialize network data once for all workers
    network_dict = network_data.model_dump()

    # Evaluate generation 0 to compute normalization parameters
    logger.info(
        f"Evaluating initial population (size={req.population_size}) for normalization..."
    )
    max_workers = min(multiprocessing.cpu_count(), req.population_size)

    with ProcessPoolExecutor(
        max_workers=max_workers, initializer=worker_init, initargs=(network_dict,)
    ) as pool:
        # Submit initial evaluations (raw metrics only, no normalization yet)
        futures = {}
        for idx, genes in enumerate(population):
            signal_plan = genes_to_signal_plan(genes)
            config_dict = prepare_config_for_candidate(
                req.base_config, signal_plan, 0, idx, req.seed
            )
            future = pool.submit(
                evaluate_candidate_raw, config_dict, req.ticks_per_eval
            )
            futures[future] = idx

        # Collect results (no normalization yet, just raw metrics)
        initial_results: list[dict[str, float] | None] = [None] * req.population_size
        failed_count = 0
        # HIGH-2: Use 'for future, idx in futures.items():' to access both future and index
        for future, idx in futures.items():
            try:
                result = future.result(timeout=EVAL_TIMEOUT_SECONDS)
                initial_results[idx] = result
            except TimeoutError:
                logger.warning(
                    f"Generation 0 candidate {idx} timed out after {EVAL_TIMEOUT_SECONDS}s"
                )
                initial_results[idx] = {
                    "throughput": 0.0,
                    "avg_wait": 0.0,
                    "max_queue": 0.0,
                }
                failed_count += 1
            except BrokenProcessPool:
                logger.error("Worker pool crashed during generation 0 evaluation")
                raise HTTPException(500, "Worker process pool crashed unexpectedly")
            except Exception as e:  # noqa: BLE001
                logger.error(f"Generation 0 candidate {idx} failed: {e}")
                initial_results[idx] = {
                    "throughput": 0.0,
                    "avg_wait": 0.0,
                    "max_queue": 0.0,
                }
                failed_count += 1

        # Check for catastrophic failure
        if failed_count >= req.population_size * 0.5:
            raise HTTPException(
                500,
                f"Generation 0: {failed_count}/{req.population_size} evaluations failed (≥50% threshold)",
            )

        # Compute normalization parameters from generation 0
        throughput_values = [r["throughput"] for r in initial_results if r is not None]
        wait_values = [r["avg_wait"] for r in initial_results if r is not None]
        queue_values = [r["max_queue"] for r in initial_results if r is not None]

        normalization_params = {
            "throughput": (min(throughput_values), max(throughput_values)),
            "avg_wait": (min(wait_values), max(wait_values)),
            "max_queue": (min(queue_values), max(queue_values)),
        }

        # Check for completely uniform population (all metrics have zero range)
        eps = 1e-9
        all_uniform = all(
            max_val - min_val < eps
            for min_val, max_val in normalization_params.values()
        )
        if all_uniform:
            raise HTTPException(
                400,
                "Initial population is completely uniform across all metrics (throughput, wait, queue)",
            )

        # Log warnings for individual zero-range metrics
        for metric, (min_val, max_val) in normalization_params.items():
            if max_val - min_val < eps:
                logger.warning(
                    f"Metric '{metric}' has zero range in generation 0: all values ≈ {min_val:.2f}"
                )

        logger.info(
            f"Normalization params: throughput={normalization_params['throughput']}, "
            f"wait={normalization_params['avg_wait']}, queue={normalization_params['max_queue']}"
        )

        # Re-evaluate generation 0 with normalization to compute fitness
        futures = {}
        for idx, genes in enumerate(population):
            signal_plan = genes_to_signal_plan(genes)
            config_dict = prepare_config_for_candidate(
                req.base_config, signal_plan, 0, idx, req.seed
            )
            future = pool.submit(
                evaluate_candidate,
                config_dict,
                req.ticks_per_eval,
                req.w_throughput,
                req.w_wait,
                req.w_queue,
                normalization_params,
            )
            futures[future] = idx

        # Collect normalized results for generation 0
        gen0_results: list[CandidateMetrics | None] = [None] * req.population_size
        failed_count = 0
        for future, idx in futures.items():
            try:
                result = future.result(timeout=EVAL_TIMEOUT_SECONDS)
                gen0_results[idx] = CandidateMetrics(**result)
            except TimeoutError:
                logger.warning(
                    f"Generation 0 (normalized) candidate {idx} timed out after {EVAL_TIMEOUT_SECONDS}s"
                )
                gen0_results[idx] = CandidateMetrics(
                    throughput=0.0, avg_wait=0.0, max_queue=0.0, fitness=-np.inf
                )
                failed_count += 1
            except BrokenProcessPool:
                logger.error(
                    "Worker pool crashed during generation 0 normalized evaluation"
                )
                raise HTTPException(500, "Worker process pool crashed unexpectedly")
            except Exception as e:  # noqa: BLE001
                logger.error(f"Generation 0 (normalized) candidate {idx} failed: {e}")
                gen0_results[idx] = CandidateMetrics(
                    throughput=0.0, avg_wait=0.0, max_queue=0.0, fitness=-np.inf
                )
                failed_count += 1

        if failed_count >= req.population_size * 0.5:
            raise HTTPException(
                500,
                f"Generation 0 (normalized): {failed_count}/{req.population_size} evaluations failed (≥50% threshold)",
            )

        # Track global best
        fitness_array = np.array([r.fitness for r in gen0_results if r is not None])
        best_idx = int(np.argmax(fitness_array))
        global_best_genes = population[best_idx].copy()
        global_best_metrics = gen0_results[best_idx]
        assert global_best_metrics is not None  # Type narrowing for mypy

        logger.info(
            f"Generation 0: best fitness={global_best_metrics.fitness:.4f}, "
            f"throughput={global_best_metrics.throughput:.1f}, "
            f"wait={global_best_metrics.avg_wait:.2f}, "
            f"queue={global_best_metrics.max_queue:.1f}"
        )

        # HIGH-1: ProcessPoolExecutor created ONCE, wrapping entire generation loop
        # Generation loop (starts from generation 1, since gen 0 is already evaluated)
        for gen in range(1, req.generations):
            logger.info(f"Generation {gen}/{req.generations - 1}...")

            # Sort population by fitness and extract elites
            sorted_indices = np.argsort(fitness_array)[::-1]  # descending
            elite_count = max(1, int(req.population_size * 0.1))
            elite_indices = sorted_indices[:elite_count]
            elites = [population[i].copy() for i in elite_indices]

            # Generate offspring
            offspring: list[np.ndarray] = []
            offspring_count = req.population_size - elite_count
            while len(offspring) < offspring_count:
                parent1 = tournament_select(population, fitness_array, rng)
                parent2 = tournament_select(population, fitness_array, rng)

                if rng.random() < 0.8:  # p_crossover = 0.8
                    child1, child2 = crossover(parent1, parent2, rng)
                else:
                    child1, child2 = parent1.copy(), parent2.copy()

                mutate(child1, rng)
                mutate(child2, rng)

                offspring.append(child1)
                if len(offspring) < offspring_count:
                    offspring.append(child2)

            # Replace population with elites + offspring
            population = elites + offspring

            # Evaluate new population
            futures = {}
            for idx, genes in enumerate(population):
                signal_plan = genes_to_signal_plan(genes)
                config_dict = prepare_config_for_candidate(
                    req.base_config, signal_plan, gen, idx, req.seed
                )
                future = pool.submit(
                    evaluate_candidate,
                    config_dict,
                    req.ticks_per_eval,
                    req.w_throughput,
                    req.w_wait,
                    req.w_queue,
                    normalization_params,
                )
                futures[future] = idx

            # Collect results
            results: list[CandidateMetrics | None] = [None] * req.population_size
            failed_count = 0
            for future, idx in futures.items():
                try:
                    result = future.result(timeout=EVAL_TIMEOUT_SECONDS)
                    results[idx] = CandidateMetrics(**result)
                except TimeoutError:
                    logger.warning(
                        f"Generation {gen} candidate {idx} timed out after {EVAL_TIMEOUT_SECONDS}s"
                    )
                    results[idx] = CandidateMetrics(
                        throughput=0.0, avg_wait=0.0, max_queue=0.0, fitness=-np.inf
                    )
                    failed_count += 1
                except BrokenProcessPool:
                    logger.error(
                        f"Worker pool crashed during generation {gen} evaluation"
                    )
                    raise HTTPException(500, "Worker process pool crashed unexpectedly")
                except Exception as e:  # noqa: BLE001
                    logger.error(f"Generation {gen} candidate {idx} failed: {e}")
                    results[idx] = CandidateMetrics(
                        throughput=0.0, avg_wait=0.0, max_queue=0.0, fitness=-np.inf
                    )
                    failed_count += 1

            # Check for catastrophic failure
            if failed_count >= req.population_size * 0.5:
                raise HTTPException(
                    500,
                    f"Generation {gen}: {failed_count}/{req.population_size} evaluations failed (≥50% threshold)",
                )

            # Update fitness array and track global best
            fitness_array = np.array([r.fitness for r in results if r is not None])
            best_idx = int(np.argmax(fitness_array))
            best_result = results[best_idx]
            assert best_result is not None  # Type narrowing for mypy
            if best_result.fitness > global_best_metrics.fitness:
                global_best_genes = population[best_idx].copy()
                global_best_metrics = best_result

            logger.info(
                f"Generation {gen}: best fitness={fitness_array[best_idx]:.4f}, "
                f"global best fitness={global_best_metrics.fitness:.4f}"
            )

    # Finalization
    elapsed_seconds = time.time() - start_time
    best_signal_plan = genes_to_signal_plan(global_best_genes)
    total_evaluations = req.population_size * req.generations

    logger.info(
        f"Optimization complete: {total_evaluations} evaluations in {elapsed_seconds:.1f}s, "
        f"best fitness={global_best_metrics.fitness:.4f}"
    )

    return OptimizationResult(
        best_signal_plan=best_signal_plan,
        best_metrics=global_best_metrics,
        elapsed_seconds=elapsed_seconds,
        total_evaluations=total_evaluations,
    )
