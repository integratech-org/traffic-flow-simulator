"""python -m unittest tests.test_demand"""

import datetime as dt
import unittest

from src.engine.demand import spawn_rate, time_of_day_multiplier
from src.simulation.schemas import (
    CreateRunRequest,
    DayOfWeek,
    DensityScenario,
    WeatherCondition,
)


class DemandTests(unittest.TestCase):
    def test_evening_peak_higher_than_overnight(self) -> None:
        self.assertGreater(
            time_of_day_multiplier(dt.time(18, 0)),
            time_of_day_multiplier(dt.time(2, 0)),
        )

    def test_weekday_higher_than_sunday(self) -> None:
        weekday = CreateRunRequest(
            day_of_week=DayOfWeek.WEDNESDAY,
            time=dt.time(8, 0),
            weather_condition=WeatherCondition.CLEAR,
            density_scenario=DensityScenario.MODERATE,
        )
        sunday = weekday.model_copy(update={"day_of_week": DayOfWeek.SUNDAY})
        self.assertGreater(spawn_rate(weekday), spawn_rate(sunday))

    def test_rain_reduces_volume_vs_clear(self) -> None:
        clear = CreateRunRequest(
            day_of_week=DayOfWeek.FRIDAY,
            time=dt.time(17, 30),
            weather_condition=WeatherCondition.CLEAR,
            density_scenario=DensityScenario.MODERATE,
        )
        rain = clear.model_copy(
            update={"weather_condition": WeatherCondition.HEAVY_RAIN}
        )
        self.assertGreater(spawn_rate(clear), spawn_rate(rain))


if __name__ == "__main__":
    unittest.main()
