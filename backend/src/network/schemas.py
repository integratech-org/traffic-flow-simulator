from pydantic import BaseModel


class Lane(BaseModel):
    legId: str
    direction: str
    laneIndex: int
    numCells: int
    # ACCIDENT_FIX: cellCoords format is [longitude, latitude] (GeoJSON standard)
    # This is OPPOSITE of typical geographic (lat, lon) order
    # Example: [121.048424, 14.717872] = [lon, lat]
    # Must unpack as: lon, lat = cellCoords[i]
    cellCoords: list[tuple[float, float]]
    connectsTo: str | None = None


class Network(BaseModel):
    cellSizeMeters: float
    junction: str
    lanes: dict[str, Lane]
