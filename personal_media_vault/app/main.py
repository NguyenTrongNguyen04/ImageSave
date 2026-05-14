from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import api_router
from app.config import get_settings
from app.db import async_engine
from app.models.base import Base
from app import models as _models  # ensure models are imported before create_all

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    async with async_engine.begin() as conn:
        # Create tables that don't yet exist
        await conn.run_sync(Base.metadata.create_all)

        # SQLite migration: add user_id column to media if missing
        try:
            await conn.execute(text("ALTER TABLE media ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            logger.info("Migrated: added user_id column to media table")
        except Exception:
            pass  # Column already exists — ignore

    # Seed admin user from env if not present in DB
    from app.models.user import User
    from app.utils.security import hash_password, verify_password

    async with AsyncSession(async_engine) as session:
        result = await session.execute(
            select(User).where(User.username == settings.admin_username)
        )
        admin = result.scalar_one_or_none()

        if admin is None:
            admin = User(
                username=settings.admin_username,
                email=f"{settings.admin_username}@vault.local",
                password_hash=settings.admin_password_hash,
            )
            session.add(admin)
            await session.commit()
            logger.info("Seeded admin user: %s", settings.admin_username)
        else:
            # Sync password hash in case env changed
            if admin.password_hash != settings.admin_password_hash:
                admin.password_hash = settings.admin_password_hash
                await session.commit()

    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Personal Media Vault API",
        version="0.2.0",
        lifespan=lifespan,
    )

    @app.get("/")
    async def root() -> dict[str, str]:
        return {"status": "ok", "docs": "/docs", "openapi": "/openapi.json"}

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon() -> Response:
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
