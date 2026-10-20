"""FastAPI router for traffic light optimization endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request

from src.optimizer.schemas import OptimizationRequest, OptimizationResult
from src.optimizer.service import run_optimization, run_optimization_realtime
from src.simulation.dependencies import valid_run_id
from src.simulation.models import Run

router = APIRouter(prefix="/optimization", tags=["Optimization"])

RunDep = Annotated[Run, Depends(valid_run_id)]


@router.post("/optimize", response_model=OptimizationResult)
async def optimize_signal_plan(
    req: OptimizationRequest, request: Request
) -> OptimizationResult:
    """Optimize traffic signal timing using genetic algorithm.

    This endpoint runs a multi-generational genetic algorithm to find signal timing
    configurations that maximize vehicle throughput while minimizing average wait time
    and maximum queue length. This is a long-running operation (typically 5-60 seconds
    depending on population size, generations, and ticks_per_eval).

    **Typical Runtime:**
    - Small runs (pop=10, gen=5, ticks=300): ~5-15 seconds
    - Medium runs (pop=20, gen=10, ticks=600): ~20-40 seconds
    - Large runs (pop=50, gen=20, ticks=1200): 60+ seconds

    **Parameters:**
    - `base_config`: Base simulation configuration (day, time, weather, vehicle mix).
      The signal_plan in base_config serves as the starting point for optimization.
    - `population_size`: Number of individuals in the GA population (default: 20).
      Larger populations explore more solutions but increase runtime linearly.
    - `generations`: Number of evolutionary generations (default: 10).
      More generations improve convergence but increase runtime linearly.
    - `ticks_per_eval`: Simulation duration for evaluating each candidate (default: 600).
      600 ticks ≈ 10 minutes of simulated time. Longer evaluations are more accurate
      but slower. Must be ≥100 ticks.
    - `w_throughput`: Weight for maximizing throughput (default: 1.0).
      Set higher to prioritize moving more vehicles through the network.
    - `w_wait`: Weight for minimizing average wait time (default: 1.0).
      Set higher to prioritize reducing time vehicles spend stopped.
    - `w_queue`: Weight for minimizing maximum queue length (default: 1.0).
      Set higher to prioritize preventing long queues at any single signal.
    - `seed`: Optional seed for reproducibility (default: None).
      Same seed produces identical results across runs.

    **Returns:**
    - `best_signal_plan`: The optimized signal timing configuration with green/yellow/red
      durations for each traffic light in the network.
    - `best_metrics`: Performance metrics of the best signal plan:
      - `throughput`: Number of vehicles that completed their journey (higher is better)
      - `avg_wait`: Average ticks vehicles spent stopped (lower is better)
      - `max_queue`: Maximum simultaneous stopped vehicles in any lane (lower is better)
      - `fitness`: Combined weighted score used by the GA (higher is better)
    - `elapsed_seconds`: Total wall-clock time for the optimization run.
    - `total_evaluations`: Total number of signal plans evaluated (population_size × generations).

    **Example Request:**
    ```json
    {
      "base_config": {
        "day_of_week": "wednesday",
        "time": "08:00:00",
        "weather_condition": "clear",
        "density_scenario": "moderate"
      },
      "population_size": 20,
      "generations": 10,
      "ticks_per_eval": 600,
      "w_throughput": 1.0,
      "w_wait": 1.0,
      "w_queue": 1.0,
      "seed": 42
    }
    ```

    **Example Response:**
    ```json
    {
      "best_signal_plan": {
        "signal_timers": [
          {"green_ticks": 45, "yellow_ticks": 5, "red_ticks": 50},
          {"green_ticks": 40, "yellow_ticks": 5, "red_ticks": 55},
          ...
        ]
      },
      "best_metrics": {
        "throughput": 234.0,
        "avg_wait": 12.3,
        "max_queue": 18.0,
        "fitness": 0.78
      },
      "elapsed_seconds": 25.4,
      "total_evaluations": 200
    }
    ```
    """
    network_data = request.state.network_data
    return run_optimization(req, network_data)


@router.post("/optimize-realtime/{run_id}", response_model=OptimizationResult)
async def optimize_realtime(
    run: RunDep, req: OptimizationRequest, request: Request
) -> OptimizationResult:
    """TASK_REALTIME_OPTIMIZE: Optimize signal plan using CURRENT traffic state.

    This endpoint optimizes traffic signals while the simulation is RUNNING,
    using the current traffic conditions as baseline. The optimized plan is
    automatically applied to the running simulation.

    Unlike the standard optimize endpoint which starts from scratch, this endpoint:
    - Uses current vehicle positions and traffic patterns
    - Keeps simulation running during optimization (background processing)
    - Applies new signal plan immediately upon completion
    - More realistic as it adapts to actual traffic conditions

    **Use Case:**
    User starts simulation → Traffic builds up → Click "Optimize Now" →
    System finds better signal timing → Apply immediately

    **Runtime:** Same as standard optimize (5-60 seconds depending on parameters)

    **Returns:** Same as standard optimize, plus the new plan is live in the simulation
    """
    network_data = request.state.network_data
    result = run_optimization_realtime(req, run, network_data)
    return result
