from fastapi import APIRouter, Request

from src.network.schemas import Network

router = APIRouter(prefix="/network", tags=["Network"])


@router.get("", response_model=Network)
async def get_network(request: Request) -> Network:
    return request.state.network_data
