from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TypedDict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.network import router as network_router
from src.network.schemas import Network
from src.network.service import load_network_data
from src.schemas import HealthResponse


class State(TypedDict):
    network_data: Network


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[State]:
    network_data = load_network_data()
    yield {"network_data": network_data}


def get_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(lifespan=lifespan, title="traffic-flow-simulator")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(network_router.router)

    @app.get("/health", response_model=HealthResponse, tags=["Health"])
    async def health_check() -> HealthResponse:
        return HealthResponse(status="ok")

    return app


app = get_app()
