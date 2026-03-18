from __future__ import annotations

from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field, HttpUrl


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class UploadAuthResponse(BaseModel):
    token: str
    expire: int
    signature: str


class MediaSyncRequest(BaseModel):
    imagekit_file_id: str = Field(min_length=1, max_length=128)
    url: HttpUrl
    file_name: str = Field(min_length=1, max_length=512)
    file_type: str = Field(min_length=1, max_length=32)
    size_bytes: int = Field(ge=0, le=2_147_483_647)


class MediaCreateResponse(BaseModel):
    id: int
    message: str


class MediaOut(BaseModel):
    id: int
    imagekit_file_id: str
    url: HttpUrl
    file_name: str
    file_type: str
    size_bytes: int
    created_at: datetime


class MediaListResponse(BaseModel):
    data: List[MediaOut]
    total_items: int
    total_pages: int
    current_page: int

