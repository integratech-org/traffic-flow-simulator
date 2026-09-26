import json

from src.network.constants import NETWORK_JSON_PATH
from src.network.schemas import Network


def load_network_data() -> Network:
    with open(NETWORK_JSON_PATH) as f:
        raw = json.load(f)
    return Network.model_validate(raw)
