from fastapi import HTTPException, status

from src.simulation.models import Run
from src.simulation.service import RUNS


def valid_run_id(run_id: str) -> Run:
    run = RUNS.get(run_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run '{run_id}' not found",
        )
    return run
