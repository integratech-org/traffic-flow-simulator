# Traffic Light Optimizer Implementation Plan

This plan implements the genetic algorithm-based traffic light signal timing optimizer as specified in `.agents/tasks/optimization-design.md`. The implementation is structured into 3 sequential features, each leaving the codebase in a buildable and testable state.

## Critical Fixes to Apply

The following 5 HIGH severity fixes from the design review MUST be implemented:

- **HIGH-1**: ProcessPoolExecutor created ONCE outside the generation loop (not recreated per generation)
- **HIGH-2**: Future collection uses `for future, idx in futures.items():` to access both future and candidate index
- **HIGH-3**: CandidateMetrics fields typed as `float` (engine returns int for throughput/max_queue but coerced to float)
- **HIGH-4**: Normalization checks `if max_val - min_val < eps: return 0.0` with NO `+ eps` in divisor
- **HIGH-5**: Seed derivation is `(request_seed + generation_idx * 1000 + candidate_index) % (2**32)` to differentiate generations

---

## Feature 1: Core Optimizer Module (Schemas + GA Engine)

**What**: Create the optimizer module structure with Pydantic schemas, parameter bounds, gene-to-SignalPlan conversion helpers (with validation per MEDIUM-2), and genetic algorithm operators (tournament selection, crossover, mutation). This feature establishes the foundation but does NOT include parallel execution or fitness evaluation workers.

**Files**:
- Create `backend/src/optimizer/__init__.py`
- Create `backend/src/optimizer/schemas.py`
- Create `backend/src/optimizer/engine.py`
- Create `backend/tests/test_optimizer_engine.py`

**Detailed Steps**:

1. **backend/src/optimizer/__init__.py**
   - Export `__all__ = ["router", "service", "schemas", "engine"]`

2. **backend/src/optimizer/schemas.py**
   - Import: `pydantic` (BaseModel, Field, model_validator), `src.simulation.schemas` (CreateRunRequest, SignalPlan)
   - Define `OptimizationRequest`:
     - `base_config: CreateRunRequest` (simulation config template, signal_plan ignored by optimizer)
     - `population_size: int` with `Field(default=20, ge=4, le=100)`
     - `generations: int` with `Field(default=10, ge=1, le=100)`
     - `ticks_per_eval: int` with `Field(default=600, ge=100, le=3600)`
     - `w_throughput: float`, `w_wait: float`, `w_queue: float` with `Field(default=1.0, ge=0.0)`
     - `seed: int | None` with `Field(default=None, ge=0, le=2**32-1)`
     - `@model_validator(mode="after")` that checks at least one weight > 0
   - Define `CandidateMetrics`:
     - `throughput: float` (HIGH-3: coerced from engine's int)
     - `avg_wait: float`
     - `max_queue: float` (HIGH-3: coerced from engine's int)
     - `fitness: float`
   - Define `OptimizationResult`:
     - `best_signal_plan: SignalPlan`
     - `best_metrics: CandidateMetrics`
     - `elapsed_seconds: float`
     - `total_evaluations: int`

3. **backend/src/optimizer/engine.py**
   - Import: `numpy` as np, `numpy.typing.NDArray`, `src.simulation.schemas` (SignalPlan, SignalTimer)
   - Define parameter bound constants:
     - `GREEN_MIN, GREEN_MAX = 10, 90`
     - `YELLOW_MIN, YELLOW_MAX = 3, 10`
     - `RED_MIN, RED_MAX = 10, 90`
   - Implement `genes_to_signal_plan(genes: np.ndarray) -> SignalPlan`:
     - Convert 12-element gene array to 4 SignalTimers (S1-S4)
     - Round each gene to int, clip to bounds per parameter type
     - Return SignalPlan with 4 timers
   - Implement `signal_plan_to_genes(signal_plan: SignalPlan) -> np.ndarray`:
     - MEDIUM-2 fix: Validate `{t.signal_id for t in signal_plan.signal_timers} == {"S1", "S2", "S3", "S4"}`, raise ValueError if not
     - Sort timers by signal_id to ensure consistent order
     - Extract green/yellow/red from sorted timers into 12-element array
   - Implement `initialize_population(population_size: int, base_signal_plan: SignalPlan, rng: np.random.Generator) -> list[np.ndarray]`:
     - Generate N-1 random candidates (uniform within bounds for each gene)
     - Include base_signal_plan as one candidate (baseline for comparison)
     - Return list of gene arrays
   - Implement `tournament_select(population: list[np.ndarray], fitness: np.ndarray, rng: np.random.Generator) -> np.ndarray`:
     - Select 3 candidates without replacement
     - Return winner (highest fitness)
   - Implement `crossover(parent1: np.ndarray, parent2: np.ndarray, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]`:
     - Single-point crossover at random point in [0, 12)
     - Return two offspring
   - Implement `mutate(genes: np.ndarray, rng: np.random.Generator) -> np.ndarray`:
     - For each gene, with probability 0.15, add Gaussian noise (sigma = 10% of parameter range)
     - Clip mutated gene to bounds
     - Return mutated genes

4. **backend/tests/test_optimizer_engine.py**
   - Test `genes_to_signal_plan` produces valid SignalPlan with 4 timers S1-S4
   - Test `signal_plan_to_genes` raises ValueError for wrong signal_ids (e.g., {"X1", "X2", "X3", "X4"})
   - Test round-trip: `genes -> signal_plan -> genes` preserves values
   - Test `mutate` stays within bounds after 100 iterations
   - Test `crossover` produces offspring different from parents
   - Test `tournament_select` picks from valid population indices

**Verify**:
```bash
cd /home/anton/Projects/traffic-flow-simulator/backend
python -m unittest tests.test_optimizer_engine
```

Expected: All tests pass, confirming gene conversion and GA operators work correctly.

---

## Feature 2: Service Layer with Parallel Evaluation

**What**: Implement the service layer orchestrator with ProcessPoolExecutor-based parallel fitness evaluation (HIGH-1: created once outside generation loop), worker initialization loading network data once per worker (MEDIUM-3: type annotation), evaluate_candidate worker function with normalization (HIGH-4: range check, no eps in divisor), and complete GA loop with seed handling (HIGH-5: includes generation_idx). This feature implements the multi-process evaluation pipeline, normalization from generation 0, elite selection, and error recovery.

**Files**:
- Create `backend/src/optimizer/service.py`
- Create `backend/tests/test_optimizer_service.py`

**Detailed Steps**:

1. **backend/src/optimizer/service.py** - Module setup
   - Import: `logging`, `multiprocessing`, `time`, `numpy` as np, `concurrent.futures` (ProcessPoolExecutor, TimeoutError, BrokenProcessPool), `fastapi.HTTPException`, `src.simulation.schemas.CreateRunRequest`, `src.engine.engine.TrafficEngine`, `src.network.schemas.Network`, `src.optimizer.schemas` (OptimizationRequest, OptimizationResult, CandidateMetrics), `src.optimizer.engine` (genes_to_signal_plan, signal_plan_to_genes, initialize_population, tournament_select, crossover, mutate)
   - Define constants: `EVAL_TIMEOUT_SECONDS = 30`, `logger = logging.getLogger(__name__)`
   - MEDIUM-3 fix: Add module-level type annotation `_WORKER_NETWORK: Network | None = None` (import Network at module level)

2. **backend/src/optimizer/service.py** - Worker functions
   - Implement `worker_init(network_dict: dict) -> None`:
     - Declare `global _WORKER_NETWORK`
     - Parse `network_dict` to `Network.model_validate(network_dict)`
     - Store in `_WORKER_NETWORK`
   - Implement `evaluate_candidate(config_dict: dict, ticks: int, w_throughput: float, w_wait: float, w_queue: float, normalization_params: dict[str, tuple[float, float]]) -> dict[str, float]`:
     - Parse `config_dict` to `CreateRunRequest.model_validate(config_dict)`
     - Instantiate `TrafficEngine(_WORKER_NETWORK, config)`
     - Run `engine.step()` for `ticks` iterations
     - Get `metrics = engine.metrics()` (dict with throughput, avg_wait, max_queue)
     - Define nested helper `normalize(value, metric_name)`:
       - Extract `min_val, max_val = normalization_params[metric_name]`
       - HIGH-4 fix: `if max_val - min_val < 1e-6: return 0.0` (NO `+ eps` in divisor)
       - Else: `return (value - min_val) / (max_val - min_val)`
     - Compute normalized metrics: `norm_throughput = normalize(metrics["throughput"], "throughput")`, etc.
     - Compute fitness: `w_throughput * norm_throughput - w_wait * norm_wait - w_queue * norm_queue`
     - MEDIUM-4 comment: Add note explaining negative fitness is valid (GA maximizes regardless of sign, e.g., -10 > -20)
     - Return `{"throughput": float(metrics["throughput"]), "avg_wait": metrics["avg_wait"], "max_queue": float(metrics["max_queue"]), "fitness": fitness}`

3. **backend/src/optimizer/service.py** - Helper for config preparation
   - Implement `prepare_config_for_candidate(base_config: CreateRunRequest, signal_plan: SignalPlan, generation_idx: int, candidate_index: int, request_seed: int | None) -> dict`:
     - Copy `base_config` with `signal_plan` override: `config = base_config.model_copy(update={"signal_plan": signal_plan})`
     - HIGH-5 fix: If `request_seed is not None`, set `config.seed = (request_seed + generation_idx * 1000 + candidate_index) % (2**32)`
     - Else: `config.seed = None`
     - Return `config.model_dump()`

4. **backend/src/optimizer/service.py** - Main orchestrator (part 1: initialization)
   - Implement `run_optimization(req: OptimizationRequest, network_data: Network) -> OptimizationResult`:
     - Record start time: `start_time = time.time()`
     - Initialize RNG: `rng = np.random.default_rng(req.seed)`
     - Call `initial_population = initialize_population(req.population_size, req.base_config.signal_plan, rng)`
     - Serialize network once: `network_dict = network_data.model_dump()`
     - Determine pool size: `max_workers = min(multiprocessing.cpu_count(), req.population_size)`

5. **backend/src/optimizer/service.py** - Main orchestrator (part 2: generation 0 evaluation for normalization)
   - HIGH-1 fix: Create ProcessPoolExecutor ONCE with `with ProcessPoolExecutor(max_workers=max_workers, initializer=worker_init, initargs=(network_dict,)) as pool:` wrapping entire generation loop
   - Prepare config_dicts for generation 0: `[prepare_config_for_candidate(req.base_config, genes_to_signal_plan(genes), 0, idx, req.seed) for idx, genes in enumerate(initial_population)]`
   - Submit all generation 0 evaluations to pool, creating `futures = {pool.submit(evaluate_candidate, cfg, req.ticks_per_eval, req.w_throughput, req.w_wait, req.w_queue, {}): idx for idx, cfg in enumerate(config_dicts)}` (empty normalization_params for now)
   - Collect results with error handling (HIGH-2 fix: `for future, idx in futures.items():`):
     - Wrap `future.result(timeout=EVAL_TIMEOUT_SECONDS)` in try/except:
       - `TimeoutError`: log warning, assign `fitness=-inf` placeholder
       - `BrokenProcessPool`: log error, raise `HTTPException(500, "Worker pool crashed")`
       - `Exception`: log error, assign `fitness=-inf` placeholder
     - Build `initial_results` list
   - Extract metric lists: `throughput_vals = [r["throughput"] for r in initial_results]`, etc.
   - Compute normalization_params: `{"throughput": (min(throughput_vals), max(throughput_vals)), ...}`
   - Check for zero range in all metrics: if all three ranges < 1e-6, raise `HTTPException(400, "Initial population is completely uniform")`
   - Log warnings for individual zero-range metrics

6. **backend/src/optimizer/service.py** - Main orchestrator (part 3: re-evaluate generation 0 with normalization)
   - Re-submit generation 0 evaluations with normalization_params (pool already created, still inside `with` block)
   - Collect results as before, build `initial_metrics` list of `CandidateMetrics` objects
   - Check if failed_count >= 50% of population: raise `HTTPException(500, f"Optimization failed in generation 0: {failed_count}/{req.population_size} evaluations crashed")`
   - Extract fitness array: `fitness = np.array([m.fitness for m in initial_metrics])`
   - Track global_best: `best_idx = np.argmax(fitness)`, store `global_best_genes = initial_population[best_idx].copy()`, `global_best_metrics = initial_metrics[best_idx]`

7. **backend/src/optimizer/service.py** - Main orchestrator (part 4: generation loop)
   - For `generation_idx in range(1, req.generations)`:
     - Sort population by fitness, extract elite: `elite_count = max(1, int(req.population_size * 0.1))`, `sorted_indices = np.argsort(fitness)`, `elite_indices = sorted_indices[-elite_count:]`, `elite = [initial_population[i].copy() for i in elite_indices]`
     - Generate offspring: `offspring_count = req.population_size - elite_count`, loop `offspring_count // 2` times:
       - Select two parents via `tournament_select`
       - With probability 0.8, apply `crossover`; else, copy parents
       - Apply `mutate` to each offspring
     - If population_size is odd, generate one extra offspring
     - Construct next population: `elite + offspring[:offspring_count]`
     - Prepare config_dicts for all candidates: `[prepare_config_for_candidate(req.base_config, genes_to_signal_plan(genes), generation_idx, idx, req.seed) for idx, genes in enumerate(current_population)]`
     - Submit evaluations to pool (same pool, still inside `with` block)
     - Collect results with HIGH-2 fix: `for future, idx in futures.items():`
     - Check if failed_count >= 50%: raise HTTPException with generation_idx and counts
     - Extract fitness, update global_best if improved
     - Replace `initial_population` and `initial_metrics` with current generation

8. **backend/src/optimizer/service.py** - Main orchestrator (part 5: finalization)
   - After generation loop completes (pool automatically closed at end of `with` block)
   - Construct `best_signal_plan = genes_to_signal_plan(global_best_genes)`
   - Compute `elapsed_seconds = time.time() - start_time`
   - Return `OptimizationResult(best_signal_plan=best_signal_plan, best_metrics=global_best_metrics, elapsed_seconds=elapsed_seconds, total_evaluations=req.population_size * req.generations)`

9. **backend/tests/test_optimizer_service.py**
   - Test `worker_init` loads network correctly (mock network_dict, call worker_init, check _WORKER_NETWORK is not None)
   - Test `evaluate_candidate` returns dict with required keys (throughput, avg_wait, max_queue, fitness)
   - Test normalization with zero range returns 0.0 (not division by zero): call with normalization_params where one metric has min==max
   - Test `prepare_config_for_candidate` derives different seeds for different generation_idx and candidate_index (call twice with same request_seed but different indices, assert seeds differ)
   - Test `run_optimization` with small parameters (population_size=4, generations=2, ticks_per_eval=100) completes and returns OptimizationResult with valid best_signal_plan

**Verify**:
```bash
cd /home/anton/Projects/traffic-flow-simulator/backend
python -m unittest tests.test_optimizer_service
```

Expected: All tests pass, confirming service layer correctly orchestrates GA with parallel evaluation.

**Additional verification** (quick integration check):
```bash
cd /home/anton/Projects/traffic-flow-simulator/backend
python -c "
from src.optimizer.service import run_optimization
from src.optimizer.schemas import OptimizationRequest
from src.simulation.schemas import CreateRunRequest
from src.network.service import load_network_data
req = OptimizationRequest(base_config=CreateRunRequest(), population_size=4, generations=2, ticks_per_eval=100)
result = run_optimization(req, load_network_data())
print(f'Completed: {result.total_evaluations} evals, best throughput={result.best_metrics.throughput}')
"
```

Expected: Prints completion message with total_evaluations=8 and some throughput value.

---

## Feature 3: API Endpoint and Integration

**What**: Create the FastAPI router exposing POST /optimization/optimize endpoint, register it in main.py, add comprehensive API documentation in docstrings, and write integration tests. This feature completes the implementation by making the optimizer accessible via HTTP.

**Files**:
- Create `backend/src/optimizer/router.py`
- Modify `backend/src/main.py`
- Update `backend/src/optimizer/__init__.py` docstring
- Create `backend/tests/test_optimizer_api.py`

**Detailed Steps**:

1. **backend/src/optimizer/router.py**
   - Import: `fastapi` (APIRouter, Request), `src.optimizer.schemas` (OptimizationRequest, OptimizationResult), `src.optimizer.service` (run_optimization)
   - Initialize: `router = APIRouter(prefix="/optimization", tags=["Optimization"])`
   - Implement endpoint:
     ```python
     @router.post("/optimize", response_model=OptimizationResult)
     async def optimize_signal_plan(req: OptimizationRequest, request: Request) -> OptimizationResult:
         """
         Run genetic algorithm to find the best signal plan for the given scenario.
         
         This is a long-running operation (typically 5-60 seconds depending on parameters).
         The optimizer uses a genetic algorithm to search for signal timing parameters that
         maximize vehicle throughput while minimizing average wait time and queue length.
         
         Parameters:
         - population_size: Number of candidate solutions per generation (4-100, default 20)
         - generations: Number of evolution cycles (1-100, default 10)
         - ticks_per_eval: Simulation length in ticks (100-3600, default 600 ≈ 10 min simulated)
         - w_throughput, w_wait, w_queue: Objective weights (≥0, default 1.0 each)
         - seed: Optional seed for reproducible results
         
         Returns:
         - best_signal_plan: Optimized signal timing configuration with 4 timers (S1-S4)
         - best_metrics: Performance metrics (throughput, avg_wait, max_queue, fitness)
         - elapsed_seconds: Wall-clock time for optimization
         - total_evaluations: Number of candidate evaluations performed
         """
         network_data = request.state.network_data
         return service.run_optimization(req, network_data)
     ```

2. **backend/src/main.py**
   - Add import after existing router imports: `from src.optimizer import router as optimizer_router`
   - After `app.include_router(simulation_router.router)`, add: `app.include_router(optimizer_router.router)`

3. **backend/src/optimizer/__init__.py**
   - Add module docstring:
     ```python
     """Genetic algorithm optimizer for traffic signal timing.
     
     Searches for signal plans that maximize throughput and minimize wait time and queue length.
     Main entry point: POST /optimization/optimize endpoint.
     """
     __all__ = ["router", "service", "schemas", "engine"]
     ```

4. **backend/tests/test_optimizer_api.py**
   - Import: `unittest`, `fastapi.testclient.TestClient`, `src.main.app`
   - Create test class: `class OptimizerAPITests(unittest.TestCase)`
   - Test `test_optimize_endpoint_minimal_request`:
     - Create `client = TestClient(app)`
     - Send POST to `/optimization/optimize` with minimal request body:
       ```json
       {
         "base_config": {},
         "population_size": 4,
         "generations": 2,
         "ticks_per_eval": 100
       }
       ```
     - Assert `response.status_code == 200`
     - Parse `data = response.json()`
     - Assert `"best_signal_plan" in data`
     - Assert `len(data["best_signal_plan"]["signal_timers"]) == 4`
     - Assert `"best_metrics" in data` with keys throughput, avg_wait, max_queue, fitness
     - Assert `data["elapsed_seconds"] > 0`
     - Assert `data["total_evaluations"] == 8`
   - Test `test_optimize_endpoint_invalid_weights`:
     - Send request with all weights = 0
     - Assert `response.status_code == 422` (Pydantic validation error)

**Verify**:
```bash
cd /home/anton/Projects/traffic-flow-simulator/backend
python -m unittest tests.test_optimizer_api
```

Expected: All tests pass, confirming endpoint is accessible and returns valid responses.

**Manual verification** (optional, for completeness):
```bash
cd /home/anton/Projects/traffic-flow-simulator/backend
uv run fastapi dev src/main.py &
sleep 3
curl -X POST http://localhost:8000/optimization/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "base_config": {
      "day_of_week": "friday",
      "time": "08:00",
      "density_scenario": "heavy"
    },
    "population_size": 10,
    "generations": 5,
    "ticks_per_eval": 300,
    "seed": 42
  }'
kill %1
```

Expected: Returns JSON with best_signal_plan and metrics. Running same request twice with seed=42 produces identical results (reproducibility).

---

## Summary

This plan decomposes the optimizer implementation into 3 sequential features:

1. **FEAT-001**: Core module structure, schemas, gene conversion, GA operators (foundation)
2. **FEAT-002**: Service layer with parallel evaluation, normalization, error recovery (algorithm)
3. **FEAT-003**: API endpoint, registration, integration tests (interface)

Each feature is independently verifiable via unit tests using `python -m unittest tests.test_<module>`. All 5 HIGH severity fixes are explicitly applied in the relevant steps. The final implementation will expose POST /optimization/optimize endpoint that runs genetic algorithm optimization for traffic signal timing.

**Total estimated implementation time**: 2-4 hours for an experienced developer familiar with the codebase.

**Critical verification points**:
- After FEAT-001: `python -m unittest tests.test_optimizer_engine` passes
- After FEAT-002: `python -m unittest tests.test_optimizer_service` passes
- After FEAT-003: `python -m unittest tests.test_optimizer_api` passes
- Integration: Manual curl test returns valid optimized signal plan
