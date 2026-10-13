"""Run the engine without the server:  uv run python tests/headless_run.py"""

import json

from src.engine.engine import TrafficEngine
from src.network.constants import NETWORK_JSON_PATH
from src.network.schemas import Network
from src.simulation.schemas import CreateRunRequest, DensityScenario

network = Network.model_validate(json.loads(NETWORK_JSON_PATH.read_text()))

for scenario in DensityScenario:
    eng = TrafficEngine(network, CreateRunRequest(density_scenario=scenario, seed=1))
    overlaps = 0
    for _ in range(3600):
        eng.step()
        overlaps += sum(
            1
            for lane in eng.lanes.values()
            if lane.n > 1 and len(set(lane.pos.tolist())) != lane.n
        )
    snap = eng.snapshot()
    levels: dict[str, int] = {}
    for c in snap["congestion"]:
        levels[c["level"]] = levels.get(c["level"], 0) + 1
    print(
        f"{scenario.value:9} in_network={len(snap['vehicles']):4} lanes={levels} "
        f"overlaps={overlaps} metrics={eng.metrics()}"
    )
