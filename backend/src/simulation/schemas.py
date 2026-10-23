import datetime as dt
from enum import Enum

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator


class DayOfWeek(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class WeatherCondition(str, Enum):
    CLEAR = "clear"
    LIGHT_RAIN = "light_rain"
    HEAVY_RAIN = "heavy_rain"


class DensityScenario(str, Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    HEAVY = "heavy"


class AccidentSeverity(str, Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    SEVERE = "severe"


class VehicleType(str, Enum):
    CAR = "car"  # four wheeled vehicle
    MOTORCYCLE = "motorcycle"  # two wheeled vehicle


class RunState(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"


class VehicleMix(BaseModel):
    two_wheeler_pct: float = Field(
        default=40,
        ge=0,
        le=100,
        description="Percentage of two-wheeled vehicles in the simulation",
    )
    four_wheeler_pct: float = Field(
        default=60,
        ge=0,
        le=100,
        description="Percentage of four-wheeled vehicles in the simulation",
    )

    @model_validator(mode="after")
    def must_total_100(self) -> "VehicleMix":
        if abs(self.two_wheeler_pct + self.four_wheeler_pct - 100) > 0.01:
            raise ValueError("two_wheeler_pct + four_wheeler_pct must equal 100")
        return self


class VehicleParams(BaseModel):
    v_max: int = Field(
        ..., ge=1, le=20, description="Max speed (cells/tick or m/s, see units)"
    )
    # FIX_TASK1: Removed v_min field - standard NaSch allows speed=0 naturally
    p_slow: float = Field(
        default=0.2, ge=0, le=1, description="Random slowdown probability"
    )
    length_cells: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Vehicle length in cells (paper: 1 for 2W, 2 for 4W)",
    )


def default_vehicle_params() -> dict[VehicleType, VehicleParams]:
    """Default vehicle parameters aligned with paper specifications.

    Speed values are in meters/second (m/s):
    - Car: 12 m/s ≈ 43 km/h (paper spec: 45 km/h, 5 cells/step @ 2.5m)
    - Motorcycle: 15 m/s = 54 km/h (paper spec: 54 km/h, 6 cells/step @ 2.5m)

    With 2.5m cells (paper specification), these convert to:
    - Car: 12/2.5 = 4.8 cells/tick (rounds to 5 cells/tick ≈ 45 km/h)
    - Motorcycle: 15/2.5 = 6 cells/tick (exactly 6 cells/tick = 54 km/h)

    Vehicle length (paper Section II-D):
    - Car (4-wheeler): 2 cells × 2.5m = 5 meters
    - Motorcycle (2-wheeler): 1 cell × 2.5m = 2.5 meters

    p_slow represents driver hesitation, reaction time, and cautious behavior:
    - Cars: 0.3 (30% chance of slowing per tick)
    - Motorcycles: 0.2 (20% chance - more aggressive driving)

    Note: No minimum speed needed - NaSch naturally allows speed=0 (complete stops)
    """
    return {
        VehicleType.CAR: VehicleParams(v_max=12, p_slow=0.3, length_cells=2),
        VehicleType.MOTORCYCLE: VehicleParams(v_max=15, p_slow=0.2, length_cells=1),
    }


class SignalTimer(BaseModel):
    signal_id: str
    green: int = Field(
        default=30, ge=1, description="Duration of green signal in seconds"
    )
    yellow: int = Field(
        default=5, ge=1, description="Duration of yellow signal in seconds"
    )
    red: int = Field(default=30, ge=1, description="Duration of red signal in seconds")


def default_signal_timers() -> list[SignalTimer]:
    return [SignalTimer(signal_id=f"S{i}") for i in range(1, 5)]


class SignalPlan(BaseModel):
    signal_timers: list[SignalTimer] = Field(
        default_factory=default_signal_timers,
        min_length=4,
        max_length=4,
        description="List of signal timers for each traffic signal",
    )


class CreateRunRequest(BaseModel):
    day_of_week: DayOfWeek = Field(
        default=DayOfWeek.MONDAY, description="Day of the week for the simulation"
    )
    time: dt.time = Field(
        default=dt.time(8, 0),
        description="Time of day for the simulation (HH:MM)",
    )
    weather_condition: WeatherCondition = Field(
        default=WeatherCondition.CLEAR,
        description="Weather condition for the simulation",
    )
    density_scenario: DensityScenario = Field(
        default=DensityScenario.LIGHT,
        description="Traffic density scenario for the simulation",
    )
    vehicle_mix: VehicleMix = Field(
        default_factory=VehicleMix, description="Vehicle mix for the simulation"
    )
    vehicle_params: dict[VehicleType, VehicleParams] = Field(
        default_factory=default_vehicle_params,
        description="Vehicle parameters for each vehicle type",
    )
    signal_plan: SignalPlan = Field(
        default_factory=SignalPlan, description="Signal plan for the simulation"
    )
    seed: int | None = Field(
        default=None,
        ge=0,
        le=2**32 - 1,
        description="Optional seed for reproducible runs",
    )

    @model_validator(mode="after")
    def all_vehicle_types_present(self) -> "CreateRunRequest":
        missing = set(VehicleType) - set(self.vehicle_params)
        if missing:
            raise ValueError(
                f"vehicle_params missing: {sorted(m.value for m in missing)}"
            )
        return self


class RunStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    run_id: str = Field(..., description="Unique identifier for the simulation run")
    state: RunState = Field(..., description="Current state of the simulation run")
    tick: int = Field(..., description="Current tick of the simulation run")
    created_at: AwareDatetime = Field(
        ..., description="Timestamp when the simulation run was created"
    )
    config: CreateRunRequest = Field(
        ..., description="Configuration parameters for the simulation run"
    )


class VehicleState(BaseModel):
    id: int
    type: VehicleType
    lane_id: str
    cell: int  # index into that lane's cellCoords in GET /network
    speed: int  # cells per tick


class LaneCongestion(BaseModel):
    lane_id: str
    level: str  # "light" | "moderate" | "heavy"
    density: float
    volume: int


class LaneSegment(BaseModel):
    """TASK_SEGMENTED_CONGESTION: Individual segment of a lane with localized congestion"""

    lane_id: str
    start_cell: int  # Starting cell index
    end_cell: int  # Ending cell index (exclusive)
    level: str  # "light" | "moderate" | "heavy"
    density: float  # Vehicles per cell in this segment
    vehicle_count: int  # Number of vehicles in this segment


class SignalStatus(BaseModel):
    signal_id: str
    leg_id: str
    phase: str  # "green" | "yellow" | "red"
    seconds_remaining: int  # Countdown timer for current phase


class Metrics(BaseModel):
    throughput: int  # vehicles that have left the network so far
    avg_wait: float  # seconds stopped, averaged over exited vehicles
    max_queue: int
    two_wheeler_pct: float
    four_wheeler_pct: float


class Accident(BaseModel):
    # ACCIDENT_FIX: Coordinates are stored in standard geographic order
    # lat = latitude (Y-axis, North-South, typically 14.xx for Manila)
    # lon = longitude (X-axis, East-West, typically 121.xx for Manila)
    # Note: network.json stores as [lon, lat] but Accident uses {lat, lon}
    id: str = Field(..., description="Unique identifier for the accident")
    lat: float = Field(..., description="Latitude of the accident location")
    lon: float = Field(..., description="Longitude of the accident location")
    severity: AccidentSeverity = Field(..., description="Severity of the accident")
    duration_seconds: int = Field(
        ..., ge=1, description="Duration of the accident in seconds"
    )
    created_at_tick: int = Field(
        ..., ge=0, description="Tick when the accident was created"
    )

    def is_active(self, current_tick: int) -> bool:
        """Check if the accident is still active at the given tick."""
        return current_tick < self.created_at_tick + self.duration_seconds


class TickMessage(BaseModel):
    run_id: str
    state: RunState
    tick: int
    vehicles: list[VehicleState] = []
    congestion: list[LaneCongestion] = []
    segments: list[
        LaneSegment
    ] = []  # TASK_SEGMENTED_CONGESTION: Segment-level congestion
    signals: list[SignalStatus] = []
    metrics: Metrics | None = None
    accidents: list[Accident] = []
