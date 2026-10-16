"""Spawn demand from scenario time, day of week, and weather."""

from __future__ import annotations

import datetime as dt

from src.simulation.schemas import (
    CreateRunRequest,
    DayOfWeek,
    DensityScenario,
    WeatherCondition,
)

# chance per tick, per entry lane, before scenario multipliers
SPAWN_RATE = {
    DensityScenario.LIGHT: 0.04,
    DensityScenario.MODERATE: 0.08,
    DensityScenario.HEAVY: 0.14,
}

DAY_VOLUME = {
    DayOfWeek.MONDAY: 1.05,
    DayOfWeek.TUESDAY: 1.00,
    DayOfWeek.WEDNESDAY: 1.00,
    DayOfWeek.THURSDAY: 1.02,
    DayOfWeek.FRIDAY: 1.12,
    DayOfWeek.SATURDAY: 0.72,
    DayOfWeek.SUNDAY: 0.50,
}

WEATHER_VOLUME = {
    WeatherCondition.CLEAR: 1.00,
    WeatherCondition.CLOUDY: 0.92,
    WeatherCondition.RAINY: 0.78,
}

# (start_minute inclusive, end_minute exclusive, multiplier)
_TIME_BANDS: tuple[tuple[int, int, float], ...] = (
    (0, 6 * 60, 0.22),  # overnight
    (6 * 60, 7 * 60, 0.65),  # early morning
    (7 * 60, 9 * 60, 1.45),  # morning peak
    (9 * 60, 12 * 60, 0.85),  # mid-morning
    (12 * 60, 14 * 60, 1.05),  # lunch
    (14 * 60, 16 * 60 + 30, 0.90),  # afternoon
    (16 * 60 + 30, 19 * 60 + 30, 1.55),  # evening peak
    (19 * 60 + 30, 22 * 60, 0.70),  # evening
    (22 * 60, 24 * 60, 0.35),  # late night
)

SPAWN_RATE_MIN = 0.008
SPAWN_RATE_MAX = 0.25


def time_of_day_multiplier(t: dt.time) -> float:
    minutes = t.hour * 60 + t.minute
    for start, end, mult in _TIME_BANDS:
        if start <= minutes < end:
            return mult
    return 1.0


def spawn_rate(config: CreateRunRequest) -> float:
    rate = (
        SPAWN_RATE[config.density_scenario]
        * time_of_day_multiplier(config.time)
        * DAY_VOLUME[config.day_of_week]
        * WEATHER_VOLUME[config.weather_condition]
    )
    return float(min(SPAWN_RATE_MAX, max(SPAWN_RATE_MIN, rate)))
