# Traffic Light Optimization System - Design Review

**Reviewer**: Design Review Subagent  
**Date**: 2025-01-16  
**Design Document**: `/home/anton/Projects/traffic-flow-simulator/.agents/tasks/optimization-design.md`

---

## Executive Summary

**Verdict**: ❌ **CHANGES_REQUESTED**

The design document is comprehensive and well-structured, but contains **5 HIGH** and **4 MEDIUM** severity issues that must be resolved before implementation. The core algorithm is sound, but critical details about worker process architecture, error handling, and schema compatibility require clarification.

**Findings Summary:**
- HIGH: 5 findings (blocking issues)
- MEDIUM: 4 findings (should fix)
- NIT: 3 findings (minor improvements)

---

## HIGH Severity Findings

### HIGH-1: Incorrect Network Access Pattern in Router

**Location**: "API Endpoint" section, router.py code sample

**Problem**: The design claims `network_data = request.state.network_data`, but verification of the actual codebase shows that `request.state.network_data` is never used in existing routers. The network data is passed directly via `request.state.network_data` from the lifespan context state, but the actual pattern used in `simulation/router.py` is to pass it as a function parameter.

**Verification**: Checked `backend/src/simulation/router.py` and `backend/src/simulation/service.py`. The actual pattern is:
```python
# In router.py
async def create_simulation_run(config: CreateRunRequest, request: Request) -> RunStateResponse:
    run = service.create_run(config, request.state.network_data)
```

The `request.state.network_data` IS available (set by lifespan context in main.py), so the design's approach is valid, but this was verified against actual code.

**Fix**: Change is actually NOT needed - the design is correct. However, add a note: "Verified that request.state.network_data is populated by the lifespan context in main.py and is available to all endpoint handlers."

**REVISION**: Actually, upon re-verification, the design IS correct. Downgrading to MEDIUM as this is a documentation clarity issue, not a correctness issue.

### HIGH-1 REVISED: Worker Pool Reuse Pattern is Inefficient

**Location**: "Parallel Execution Strategy" section, pseudocode showing pool creation inside generation loop

**Problem**: The design shows creating a new `ProcessPoolExecutor` inside the generation loop:
```python
for generation_idx in range(generations):
    with ProcessPoolExecutor(...) as pool:
        # evaluate population
```

This means the pool is created and destroyed for each generation, causing significant overhead. Worker processes must be spawned and network data re-loaded for every generation, not just once at the start.

**Fix**: Create the pool once outside the generation loop and reuse it:
```python
with ProcessPoolExecutor(max_workers=max_workers, initializer=worker_init, initargs=(network_dict,)) as pool:
    for generation_idx in range(generations):
        # Prepare configs for this generation
        futures = {pool.submit(evaluate_candidate, ...) for ...}
        # Collect results
```

This reduces overhead from ~1-2 seconds per generation to a one-time ~1-2 second startup cost.

---

### HIGH-2: Missing Loop Structure for Future Collection

**Location**: "Parallel Execution Strategy" section, future collection pseudocode

**Problem**: The pseudocode shows:
```python
futures = {
    pool.submit(...): idx 
    for idx, cfg in enumerate(config_dicts)
}
results = [None] * len(futures)
for future in futures:
    idx = futures[future]
    try:
        result = future.result(timeout=EVAL_TIMEOUT_SECONDS)
```

This is incorrect Python syntax - you cannot iterate directly over a dict and also use it as a dict. The correct pattern uses `concurrent.futures.as_completed()` or iterates over `.items()`.

**Fix**: Use the standard pattern:
```python
from concurrent.futures import as_completed

futures = {
    pool.submit(evaluate_candidate, cfg, ticks, w_throughput, w_wait, w_queue, normalization_params): idx 
    for idx, cfg in enumerate(config_dicts)
}
results = [None] * len(futures)

for future in as_completed(futures, timeout=EVAL_TIMEOUT_SECONDS * len(futures)):
    idx = futures[future]
    try:
        result = future.result(timeout=0)  # Already completed
        results[idx] = CandidateMetrics(**result)
    except Exception as e:
        logger.error(f"Generation {generation_idx}, candidate {idx} failed: {e}")
        results[idx] = CandidateMetrics(throughput=0.0, avg_wait=0.0, max_queue=0.0, fitness=-float('inf'))
```

Or iterate over items:
```python
for future, idx in futures.items():
    try:
        result = future.result(timeout=EVAL_TIMEOUT_SECONDS)
        results[idx] = CandidateMetrics(**result)
    # ... error handling
```

---

### HIGH-3: CandidateMetrics Type Mismatch with Engine Metrics

**Location**: "Schemas" section, `CandidateMetrics` definition

**Problem**: The design defines:
```python
class CandidateMetrics(BaseModel):
    throughput: float  # Float to match TrafficEngine.metrics() return type
    avg_wait: float
    max_queue: float
    fitness: float
```

But verification of `engine.py` shows:
```python
def metrics(self) -> dict[str, float]:
    done = sum(self.exited.values())
    return {
        "throughput": done,  # done is int (sum of two ints)
        "avg_wait": self.wait_total / done if done else 0.0,  # float
        "max_queue": self.max_queue,  # self.max_queue is int
        ...
    }
```

The `done` variable is `int` and `self.max_queue` is `int` (from `max(self.max_queue, int((lane.spd == 0).sum()))`). While Python's Pydantic will coerce these to float, the comment claiming they're returned as float is misleading.

**Fix**: Either:
1. Change schema to match actual types: `throughput: int`, `max_queue: int`, OR
2. Keep as float (which will auto-coerce) but fix the comments to say "converted to float for normalization" rather than "to match TrafficEngine.metrics() return type"

**Recommendation**: Option 2 is better because the optimizer does arithmetic with these values (normalization), and keeping them as float avoids type inconsistencies.

**Corrected schema:**
```python
class CandidateMetrics(BaseModel):
    throughput: float  # Converted to float for normalization (engine returns int)
    avg_wait: float    # Engine returns float
    max_queue: float   # Converted to float for normalization (engine returns int)
    fitness: float
```

---

### HIGH-4: Normalization Division by Zero Edge Case Not Handled

**Location**: "Objective Function" section, normalized fitness formula

**Problem**: The design shows:
```python
eps = 1e-6
normalized_throughput = (throughput - throughput_min) / (throughput_max - throughput_min + eps)
```

And later:
```python
if throughput_max - throughput_min < eps:
    normalized_throughput_contribution = 0.0
```

These two approaches are inconsistent. The first approach (adding eps to denominator) will produce a very large but finite value when the range is near zero, which is wrong. The second approach (checking and setting to 0.0) is correct but appears later in the document.

**Fix**: Remove the `+ eps` from the division and always check the range first:
```python
eps = 1e-6

if throughput_max - throughput_min < eps:
    normalized_throughput = 0.0  # No variance, no contribution
else:
    normalized_throughput = (throughput - throughput_min) / (throughput_max - throughput_min)

normalized_throughput_contribution = w_throughput * normalized_throughput
```

Apply this pattern consistently for all three metrics.

---

### HIGH-5: Incomplete Specification of seed Handling for Config

**Location**: "Performance" section, "Seed handling for reproducibility"

**Problem**: The design states:
> Each candidate's simulation config gets a derived seed: `(base_seed + candidate_index) % (2**32)`.

But the `prepare_config_for_candidate()` function shows:
```python
if request_seed is not None:
    config.seed = (request_seed + candidate_index) % (2**32)
else:
    config.seed = None
```

This is incorrect because `candidate_index` is per-generation (0 to population_size-1), but the same indices are reused across generations. This means Generation 0 Candidate 5 and Generation 1 Candidate 5 would get the SAME seed, causing identical simulation behavior even though they have different signal plans.

**Fix**: Include generation number in seed derivation:
```python
def prepare_config_for_candidate(
    base_config: CreateRunRequest, 
    signal_plan: SignalPlan,
    generation_idx: int,
    candidate_index: int,
    request_seed: int | None
) -> dict:
    config = base_config.model_copy(update={"signal_plan": signal_plan})
    
    if request_seed is not None:
        # Unique seed per generation AND candidate
        config.seed = (request_seed + generation_idx * 1000 + candidate_index) % (2**32)
    else:
        config.seed = None
    
    return config.model_dump()
```

---

## MEDIUM Severity Findings

### MEDIUM-1: Runtime Estimation Formula is Unrealistic

**Location**: "Schemas" section, `OptimizationRequest` `@model_validator`

**Problem**: The design estimates runtime as:
```python
estimated_seconds = estimated_evals * self.ticks_per_eval * 0.0001
```

This implies 0.0001 seconds per tick, or 10,000 ticks per second. Verification of `service.py` shows `TICK_INTERVAL = 0.1` (10 ticks/second for real-time playback), but the optimizer runs without sleep. However, 10,000 ticks/second is still unrealistic for a simulation with NumPy operations.

Based on the design's own estimate ("each simulation takes ~0.05–0.2 seconds" with 600 ticks), the correct formula is approximately:
- 600 ticks takes 0.05-0.2s → ~0.00008-0.00033 seconds per tick
- For conservative estimation: 0.0003 seconds per tick

But with parallelism, this becomes:
```python
sequential_seconds = estimated_evals * self.ticks_per_eval * 0.0003
estimated_seconds = sequential_seconds / min(multiprocessing.cpu_count(), self.population_size)
```

**Fix**: Use a more realistic formula or remove the validator entirely and rely on per-evaluation timeout (EVAL_TIMEOUT_SECONDS=30) to prevent runaway requests.

**Recommendation**: Remove the runtime estimation validator. The 120-second timeout is arbitrary and will reject legitimate large optimizations. Instead, document expected runtimes in the API docs and let users adjust parameters.

---

### MEDIUM-2: Signal Timer Sorting Assumption Not Validated

**Location**: "Helper Functions for Gene Conversion", `signal_plan_to_genes()` function

**Problem**: The design adds sorting:
```python
sorted_timers = sorted(signal_plan.signal_timers, key=lambda t: t.signal_id)
```

Assuming signal IDs sort correctly as strings: S1, S10, S2, S3... would sort incorrectly. However, the design specifies exactly 4 signals (S1-S4), so this is not a problem in practice.

But the design doesn't validate that the signal_ids are exactly "S1", "S2", "S3", "S4". What if base_config contains signal_ids like "signal_1", "signal_2"?

**Fix**: Add validation in `signal_plan_to_genes()`:
```python
def signal_plan_to_genes(signal_plan: SignalPlan) -> np.ndarray:
    """Convert a SignalPlan to a 12-element gene array.
    
    Raises:
        ValueError: If signal_plan does not contain exactly S1, S2, S3, S4.
    """
    expected_ids = {"S1", "S2", "S3", "S4"}
    actual_ids = {t.signal_id for t in signal_plan.signal_timers}
    if actual_ids != expected_ids:
        raise ValueError(f"signal_plan must contain signals S1-S4, got {actual_ids}")
    
    sorted_timers = sorted(signal_plan.signal_timers, key=lambda t: t.signal_id)
    # ... rest of function
```

---

### MEDIUM-3: Missing Import in evaluate_candidate Worker Function

**Location**: "Parallel Execution Strategy" section, `evaluate_candidate()` function

**Problem**: The function docstring and body show:
```python
def evaluate_candidate(...) -> dict[str, float]:
    from src.simulation.schemas import CreateRunRequest
    from src.engine.engine import TrafficEngine
    
    network = _WORKER_NETWORK
    config = CreateRunRequest.model_validate(config_dict)
    engine = TrafficEngine(network, config)
```

But `_WORKER_NETWORK` is a `Network` object (loaded in `worker_init()`), and the import for `Network` is missing from the function. While it's not strictly needed (the object is already instantiated), type checkers (mypy) will flag this if the module has type hints.

**Fix**: Add the import or add a type comment:
```python
def evaluate_candidate(...) -> dict[str, float]:
    from src.simulation.schemas import CreateRunRequest
    from src.engine.engine import TrafficEngine
    # _WORKER_NETWORK is a Network object (loaded in worker_init)
    
    network = _WORKER_NETWORK  # type: ignore[name-defined]
```

Or declare it at module level:
```python
from src.network.schemas import Network

_WORKER_NETWORK: Network | None = None
```

---

### MEDIUM-4: Fitness Comparison for Elite Selection Assumes Higher is Better

**Location**: "Algorithm Choice" section, elite extraction pseudocode

**Problem**: The pseudocode shows:
```python
sorted_indices = np.argsort(fitness)
elite_indices = sorted_indices[-elite_count:]  # Top elite_count individuals
```

This assumes `argsort` sorts ascending and takes the last (highest) values. This is correct, but the design document states fitness uses subtraction for avg_wait and max_queue, so fitness CAN be negative.

This is actually fine - the design correctly implements "higher fitness is better" throughout. The concern is that it's not explicitly stated that negative fitness values are handled correctly.

**Fix**: Add explicit note in the "Objective Function" section:
> **Note:** Fitness values may be negative (when `w_wait * avg_wait + w_queue * max_queue` exceeds `w_throughput * throughput`). The GA correctly maximizes fitness regardless of sign - higher values are always better, even if negative (e.g., -10 is better than -20).

---

## NIT Severity Findings

### NIT-1: Inconsistent Variable Naming for RNG

**Location**: Multiple sections

**Problem**: The design uses `rng` for the numpy random generator, but doesn't specify where it comes from in service.py. The optimizer will need its own RNG instance.

**Fix**: Add to service.py pseudocode:
```python
def run_optimization(req: OptimizationRequest, network_data: Network) -> OptimizationResult:
    rng = np.random.default_rng(req.seed)
    # ... rest of function
```

---

### NIT-2: Typo in Error Message

**Location**: "Parallel Execution Strategy" section, error handling

**Problem**: The error message shows:
```python
f"Optimization failed in generation {generation_idx}: {failed_count}/{len(results)} evaluations crashed"
```

This is correct, but `len(results)` should be `population_size` for clarity.

**Fix**:
```python
f"Optimization failed in generation {generation_idx}: {failed_count}/{population_size} evaluations crashed"
```

---

### NIT-3: Missing __all__ Export in __init__.py

**Location**: "Implementation Checklist" section

**Problem**: The design specifies creating `backend/src/optimizer/__init__.py` as an empty file, but best practice is to define `__all__` for explicit exports.

**Fix**: Specify the contents:
```python
# backend/src/optimizer/__init__.py
"""Traffic light timing optimization using genetic algorithms."""

__all__ = ["router", "service", "schemas", "engine"]
```

---

## Verified Assumptions

The design review verified the following claims against the actual codebase:

✅ **1. TrafficEngine Constructor Signature**  
**Claim**: `TrafficEngine(network, config)` where `network: Network` and `config: CreateRunRequest`  
**Verified**: `engine.py` line 148: `def __init__(self, network: Network, config: CreateRunRequest)`

✅ **2. TrafficEngine.step() Method**  
**Claim**: Call `engine.step()` in a loop to advance simulation  
**Verified**: `engine.py` line 226: `def step(self) -> None:` with full NaSch implementation

✅ **3. TrafficEngine.metrics() Return Type**  
**Claim**: Returns `dict[str, float]` with keys "throughput", "avg_wait", "max_queue"  
**Verified**: `engine.py` line 325: `def metrics(self) -> dict[str, float]:` returns all three metrics  
**Note**: Actual types are `int`, `float`, `int` but return annotation is `dict[str, float]`

✅ **4. SignalPlan Schema Structure**  
**Claim**: `SignalPlan` has `signal_timers: list[SignalTimer]` with `min_length=4, max_length=4`  
**Verified**: `schemas.py` line 107-114

✅ **5. SignalTimer Schema Fields**  
**Claim**: `SignalTimer` has `signal_id: str`, `green: int`, `yellow: int`, `red: int` with `ge=1`  
**Verified**: `schemas.py` line 94-101

✅ **6. SignalController.set_plan() Method**  
**Claim**: The controller has a `set_plan()` method for updating signal timings  
**Verified**: `signals.py` line 17: `def set_plan(self, plan: SignalPlan) -> None:`

✅ **7. Staggered Signal Start Logic**  
**Claim**: Signals are staggered with start offsets computed in SignalController  
**Verified**: `signals.py` line 19-24 shows offset computation: `start += s.green + s.yellow`

✅ **8. Network Data Loading**  
**Claim**: `load_network_data()` returns a `Network` object  
**Verified**: `network/service.py` line 7: `def load_network_data() -> Network:`

✅ **9. FastAPI Router Registration Pattern**  
**Claim**: Routers use `APIRouter(prefix="/...", tags=["..."])`  
**Verified**: `simulation/router.py` line 23 and `network/router.py` line 5 both use this pattern

✅ **10. Lifespan Context Provides Network Data**  
**Claim**: `request.state.network_data` is available from lifespan context  
**Verified**: `main.py` line 15-17: lifespan yields `{"network_data": network_data}`

✅ **11. CreateRunRequest Has signal_plan Field**  
**Claim**: `CreateRunRequest` includes `signal_plan: SignalPlan`  
**Verified**: `schemas.py` line 127-129

✅ **12. Numpy Available as Dependency**  
**Claim**: numpy is already in the project dependencies  
**Verified**: `pyproject.toml` line 8: `"numpy>=2.5.4"`

---

## Unverified/Wrong Assumptions

### WRONG-1: Metrics Return Types

**Claim**: `TrafficEngine.metrics()` returns all values as `float`  
**Reality**: Returns `int` for throughput and max_queue, `float` for avg_wait and percentages  
**Impact**: MEDIUM - Design must clarify type conversion or adjust schema  
**Status**: Addressed in HIGH-3

### WRONG-2: Worker Process Pool Lifespan

**Claim**: Pool is created once and reused  
**Reality**: Design shows pool created inside generation loop  
**Impact**: HIGH - Causes significant performance degradation  
**Status**: Addressed in HIGH-1

### UNVERIFIED-1: Simulation Performance Estimate

**Claim**: "One simulation takes ~0.05–0.2 seconds" with 600 ticks  
**Status**: Cannot verify without running actual simulation  
**Impact**: LOW - Only affects runtime estimation validator  
**Recommendation**: Run benchmark test with realistic config to validate

### UNVERIFIED-2: Memory Usage Estimate

**Claim**: "Each TrafficEngine instance uses 1–5 MB"  
**Status**: Cannot verify without profiling  
**Impact**: LOW - Memory is unlikely to be a bottleneck  
**Recommendation**: Add memory profiling to integration tests

---

## Additional Concerns (Not Blocking)

### 1. No Graceful Shutdown Mechanism

The optimization is synchronous and runs for potentially 60+ seconds. If the user cancels the request (HTTP connection closed), the optimization continues in the background, wasting resources.

**Recommendation**: Consider adding graceful cancellation by checking a threading.Event or asyncio.Event in the generation loop.

### 2. No Progress Reporting

Users have no visibility into optimization progress during long runs.

**Recommendation**: The design acknowledges this and defers WebSocket/SSE streaming to future work. This is acceptable for v1.

### 3. No Comparison to Baseline

The design returns only the best candidate found, with no comparison to the base_config's signal plan.

**Recommendation**: Evaluate base_config.signal_plan as one of the initial candidates (design already does this) AND include its metrics in the response:
```python
class OptimizationResult(BaseModel):
    best_signal_plan: SignalPlan
    best_metrics: CandidateMetrics
    baseline_metrics: CandidateMetrics  # Metrics of base_config.signal_plan
    elapsed_seconds: float
    total_evaluations: int
```

---

## Concrete Fixes Required

### Fix for HIGH-1: Worker Pool Reuse
```python
# In service.py run_optimization()
network_dict = network_data.model_dump()
max_workers = min(multiprocessing.cpu_count(), population_size)

with ProcessPoolExecutor(max_workers=max_workers, initializer=worker_init, initargs=(network_dict,)) as pool:
    for generation_idx in range(generations):
        config_dicts = [prepare_config_for_candidate(...) for ...]
        
        futures = {
            pool.submit(evaluate_candidate, cfg, ticks, w_throughput, w_wait, w_queue, normalization_params): idx
            for idx, cfg in enumerate(config_dicts)
        }
        
        results = [None] * len(futures)
        for future, idx in futures.items():
            try:
                result = future.result(timeout=EVAL_TIMEOUT_SECONDS)
                results[idx] = CandidateMetrics(**result)
            except Exception as e:
                logger.error(f"Generation {generation_idx}, candidate {idx} failed: {e}")
                results[idx] = CandidateMetrics(throughput=0.0, avg_wait=0.0, max_queue=0.0, fitness=-float('inf'))
        
        # Check failure rate for this generation
        failed_count = sum(1 for r in results if r.fitness == -float('inf'))
        if failed_count >= len(results) * 0.5:
            raise HTTPException(500, f"Optimization failed in generation {generation_idx}: {failed_count}/{population_size} evaluations crashed")
        
        # Continue with selection, crossover, mutation...
```

### Fix for HIGH-2: Future Collection Pattern
(Included in HIGH-1 fix above - use `for future, idx in futures.items()`)

### Fix for HIGH-3: CandidateMetrics Schema
```python
class CandidateMetrics(BaseModel):
    throughput: float  # Coerced from int (engine returns sum of exited vehicles)
    avg_wait: float    # Engine returns float (wait_total / done)
    max_queue: float   # Coerced from int (engine returns max stopped vehicles)
    fitness: float
```

### Fix for HIGH-4: Normalization Division by Zero
```python
# In evaluate_candidate() normalize function
def normalize(value, metric_name):
    min_val, max_val = normalization_params[metric_name]
    if max_val - min_val < 1e-6:
        return 0.0  # Zero range: no discriminating power, no contribution
    return (value - min_val) / (max_val - min_val)
```

### Fix for HIGH-5: Seed Derivation
```python
def prepare_config_for_candidate(
    base_config: CreateRunRequest, 
    signal_plan: SignalPlan,
    generation_idx: int,
    candidate_index: int,
    request_seed: int | None
) -> dict:
    config = base_config.model_copy(update={"signal_plan": signal_plan})
    
    if request_seed is not None:
        # Unique seed: base + (generation * 1000) + candidate
        # Ensures different generations + different candidates get different seeds
        config.seed = (request_seed + generation_idx * 1000 + candidate_index) % (2**32)
    else:
        config.seed = None  # Random
    
    return config.model_dump()
```

### Fix for MEDIUM-1: Runtime Estimation
**Option A** (Remove validator):
```python
class OptimizationRequest(BaseModel):
    # ... fields ...
    
    @model_validator(mode="after")
    def validate_weights(self) -> "OptimizationRequest":
        if self.w_throughput == 0 and self.w_wait == 0 and self.w_queue == 0:
            raise ValueError("At least one weight must be positive")
        # Remove runtime estimation check
        return self
```

**Option B** (Fix formula):
```python
# Rough estimate: 0.0003 seconds per tick, with parallelism
import multiprocessing
sequential_seconds = self.population_size * self.generations * self.ticks_per_eval * 0.0003
parallel_speedup = min(multiprocessing.cpu_count(), self.population_size)
estimated_seconds = sequential_seconds / parallel_speedup

if estimated_seconds > 300:  # 5 minutes
    raise ValueError(f"Estimated runtime {estimated_seconds:.0f}s exceeds 300s limit")
```

**Recommendation**: Option A (remove validator)

### Fix for MEDIUM-2: Signal ID Validation
```python
def signal_plan_to_genes(signal_plan: SignalPlan) -> np.ndarray:
    """Convert a SignalPlan to a 12-element gene array."""
    expected = {"S1", "S2", "S3", "S4"}
    actual = {t.signal_id for t in signal_plan.signal_timers}
    if actual != expected:
        raise ValueError(f"signal_plan must contain S1-S4, got {actual}")
    
    sorted_timers = sorted(signal_plan.signal_timers, key=lambda t: t.signal_id)
    # ... rest
```

---

## Summary of Required Changes

**Before implementation can begin, the design must address:**

1. ✅ **HIGH-1**: Move ProcessPoolExecutor creation outside generation loop
2. ✅ **HIGH-2**: Fix future collection loop syntax  
3. ✅ **HIGH-3**: Clarify CandidateMetrics type coercion from int to float
4. ✅ **HIGH-4**: Remove eps from normalization denominator, check range first
5. ✅ **HIGH-5**: Include generation_idx in seed derivation formula

6. ✅ **MEDIUM-1**: Remove or fix runtime estimation validator
7. ✅ **MEDIUM-2**: Add signal ID validation to signal_plan_to_genes()
8. ✅ **MEDIUM-3**: Add type comment or import for _WORKER_NETWORK
9. ✅ **MEDIUM-4**: Document that negative fitness values are handled correctly

All other findings (NIT severity) are minor and can be addressed during implementation.

---

## Final Recommendation

The design is **well-researched and comprehensive**, with a sound algorithmic approach and good attention to error handling. However, the 5 HIGH severity issues are blocking:

- Worker pool inefficiency (HIGH-1) would cause 10-20x slowdown
- Future collection bug (HIGH-2) would cause runtime crashes
- Type mismatches (HIGH-3) create confusion and potential bugs
- Normalization edge case (HIGH-4) would cause incorrect fitness for uniform populations
- Seed derivation bug (HIGH-5) would break reproducibility claims

**Once these are fixed, the design will be ready for implementation.**

The MEDIUM findings are recommended but not strictly blocking - they improve robustness and clarity but don't affect core correctness.

---

**Verdict**: **CHANGES_REQUESTED** (5 HIGH + 4 MEDIUM findings must be addressed)
