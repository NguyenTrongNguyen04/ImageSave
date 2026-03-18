from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.schemas.media_schema import LoginRequest, TokenResponse
from app.utils.security import create_access_token, verify_password


router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, settings: Settings = Depends(get_settings)) -> TokenResponse:
    """
    Authenticate the single admin user.

    Credentials are stored in environment variables:
    - ADMIN_USERNAME
    - ADMIN_PASSWORD_HASH (bcrypt)
    """
    if payload.username != settings.admin_username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(payload.password, settings.admin_password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(
        subject=settings.admin_username,
        settings=settings,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(access_token=token)

