from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    """
    Placeholder model for future expansion.

    Current SRS uses a single admin (env-based) so this table is not used yet,
    but having it in-place keeps the project structure aligned with the spec.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
