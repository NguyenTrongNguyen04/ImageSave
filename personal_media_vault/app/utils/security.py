from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from app.config import Settings, get_settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


@dataclass(frozen=True, slots=True)
class AdminPrincipal:
    username: str


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except Exception:
        return False


def create_access_token(*, subject: str, settings: Settings, expires_delta: Optional[timedelta] = None) -> str:
    # Keep the token minimal:
    # - sub: who the token represents (single admin user in this SRS)
    # - iat/exp: enables expiry checks and future rotation strategies
    now = datetime.now(tz=timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload: Dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(*, token: str, settings: Settings) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from e
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from e


def get_current_admin(
    token: str = Depends(oauth2_scheme),
    settings: Settings = Depends(get_settings),
) -> AdminPrincipal:
    # This vault is intentionally single-user:
    # - we validate that the JWT subject matches ADMIN_USERNAME
    # - no user table lookup required (keeps the system simple for a personal vault)
    payload = decode_token(token=token, settings=settings)
    username = payload.get("sub")
    if not isinstance(username, str) or username != settings.admin_username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    return AdminPrincipal(username=username)

