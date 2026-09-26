from pydantic import BaseModel


class Lane(BaseModel):
    legId: str
    direction: str
    laneIndex: int
    numCells: int
    cellCoords: list[tuple[float, float]]
    connectsTo: str | None = None


class Network(BaseModel):
    cellSizeMeters: float
    junction: str
    lanes: dict[str, Lane]
