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
    CLOUDY = "cloudy"
    RAINY = "rainy"


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
    v_min: int = Field(
        default=0, ge=0, description="Min speed. Keep 0 so vehicles can stop at red."
    )
    p_slow: float = Field(
        default=0.2, ge=0, le=1, description="Random slowdown probability"
    )

    @model_validator(mode="after")
    def must_v_min_be_less_than_v_max(self) -> "VehicleParams":
        if self.v_min >= self.v_max:
            raise ValueError("v_min must be less than v_max")
        return self


def default_vehicle_params() -> dict[VehicleType, VehicleParams]:
    return {
        VehicleType.CAR: VehicleParams(v_max=15, p_slow=0.2),
        VehicleType.MOTORCYCLE: VehicleParams(v_max=20, p_slow=0.1),
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


class SignalStatus(BaseModel):
    signal_id: str
    leg_id: str
    phase: str  # "green" | "yellow" | "red"


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
    signals: list[SignalStatus] = []
    metrics: Metrics | None = None
    accidents: list[Accident] = []
