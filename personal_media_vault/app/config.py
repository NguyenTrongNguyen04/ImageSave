from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ImageKit
    imagekit_public_key: str = Field(alias="IMAGEKIT_PUBLIC_KEY")
    imagekit_private_key: str = Field(alias="IMAGEKIT_PRIVATE_KEY")
    imagekit_url_endpoint: str = Field(alias="IMAGEKIT_URL_ENDPOINT")

    # Admin auth (single-user vault)
    admin_username: str = Field(alias="ADMIN_USERNAME")
    admin_password_hash: str = Field(alias="ADMIN_PASSWORD_HASH")

    # JWT
    secret_key: str = Field(alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=60 * 24 * 30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Database
    database_url: str = Field(default="sqlite+aiosqlite:///./personal_media_vault.db", alias="DATABASE_URL")

    # CORS
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    def parsed_cors_origins(self) -> List[str]:
        raw = (self.cors_origins or "").strip()
        if raw == "*" or raw == "":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

