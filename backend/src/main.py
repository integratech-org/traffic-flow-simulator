from fastapi import FastAPI

from src.schemas import HealthResponse

app = FastAPI(title="traffic-flow-simulator")


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok")
