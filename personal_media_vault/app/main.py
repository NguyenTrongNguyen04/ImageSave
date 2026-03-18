from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.config import get_settings
from app.db import async_engine
from app.models.base import Base
from app import models as _models  # ensure models are imported before create_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables on startup (SQLite)
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Personal Media Vault API",
        version="0.1.0",
        lifespan=lifespan,
    )

    @app.get("/")
    async def root() -> dict[str, str]:
        return {"status": "ok", "docs": "/docs", "openapi": "/openapi.json"}

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon() -> Response:
        # Avoid noisy 404s when the browser requests favicon by default.
        return Response(status_code=204)

    origins = settings.parsed_cors_origins()
    allow_all = origins == ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if allow_all else origins,
        allow_credentials=not allow_all,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    return app


app = create_app()

