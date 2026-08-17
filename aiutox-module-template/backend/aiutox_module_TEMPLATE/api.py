"""TEMPLATE module API routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/TEMPLATE", tags=["TEMPLATE"])


@router.get("/")
async def list_items():
    return {"data": [], "message": "TEMPLATE module"}
