"""Pydantic schemas for optimization requests and responses."""

from pydantic import BaseModel, Field, model_validator

from src.simulation.schemas import CreateRunRequest, SignalPlan


class OptimizationRequest(BaseModel):
    """Request schema for traffic light optimization."""

    base_config: CreateRunRequest = Field(
        ...,
        description="Base simulation configuration (day, time, weather, vehicle mix, etc.). The signal_plan field is used as baseline.",
    )
    population_size: int = Field(
        default=20,
        ge=4,
        le=100,
        description="Number of individuals in the GA population. Larger populations explore more but run slower.",
    )
    generations: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Number of GA generations. More generations improve convergence but increase runtime.",
    )
    ticks_per_eval: int = Field(
        default=600,
        ge=100,
        le=3600,
        description="Number of simulation ticks to run for each candidate evaluation. 600 ticks ≈ 10 minutes simulated time.",
    )
    w_throughput: float = Field(
        default=1.0,
        ge=0.0,
        description="Weight for throughput (maximize). Set to 0 to ignore.",
    )
    w_wait: float = Field(
        default=1.0,
        ge=0.0,
        description="Weight for average wait time (minimize). Set to 0 to ignore.",
    )
    w_queue: float = Field(
        default=1.0,
        ge=0.0,
        description="Weight for maximum queue length (minimize). Set to 0 to ignore.",
    )
    seed: int | None = Field(
        default=None,
        ge=0,
        le=2**32 - 1,
        description="Optional seed for reproducible optimization runs. If None, random.",
    )

    @model_validator(mode="after")
    def validate_weights(self) -> "OptimizationRequest":
        """Ensure at least one weight is positive."""
        if self.w_throughput == 0 and self.w_wait == 0 and self.w_queue == 0:
            raise ValueError(
                "At least one weight (w_throughput, w_wait, w_queue) must be positive"
            )
        return self


class CandidateMetrics(BaseModel):
    """Metrics for a single candidate signal plan.

    HIGH-3: All metrics are float type. Engine returns int for throughput and max_queue,
    which are coerced to float by Pydantic for consistent normalization arithmetic.
    """

    throughput: float = Field(
        ..., description="Number of vehicles that exited the network (coerced from int)"
    )
    avg_wait: float = Field(
        ...,
        description="Average ticks a vehicle spent stopped, computed over exited vehicles",
    )
    max_queue: float = Field(
        ...,
        description="Maximum number of vehicles simultaneously stopped in any lane (coerced from int)",
    )
    fitness: float = Field(..., description="Combined fitness score for this candidate")


class OptimizationResult(BaseModel):
    """Result of an optimization run."""

    best_signal_plan: SignalPlan = Field(
        ..., description="The signal plan with the highest fitness score."
    )
    best_metrics: CandidateMetrics = Field(
        ..., description="Metrics and fitness of the best signal plan."
    )
    elapsed_seconds: float = Field(
        ..., description="Total wall-clock time for the optimization."
    )
    total_evaluations: int = Field(
        ...,
        description="Total number of candidate evaluations (population_size × generations).",
    )
