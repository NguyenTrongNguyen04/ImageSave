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
class UserPrincipal:
    id: int
    username: str


# Backwards-compat alias used elsewhere in the codebase
AdminPrincipal = UserPrincipal


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except Exception:
        return False


def create_access_token(
    *,
    subject: str,
    user_id: int,
    settings: Settings,
    expires_delta: Optional[timedelta] = None,
) -> str:
    now = datetime.now(tz=timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload: Dict[str, Any] = {
        "sub": subject,
        "user_id": user_id,
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


def get_current_user(
    token: str = Depends(oauth2_scheme),
    settings: Settings = Depends(get_settings),
) -> UserPrincipal:
    payload = decode_token(token=token, settings=settings)
    username = payload.get("sub")
    user_id = payload.get("user_id")
    if not isinstance(username, str) or not isinstance(user_id, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return UserPrincipal(id=user_id, username=username)


# Keep old name working
get_current_admin = get_current_user
