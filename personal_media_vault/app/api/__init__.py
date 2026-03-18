from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.media import router as media_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(media_router, prefix="/media", tags=["media"])

__all__ = ["api_router"]
