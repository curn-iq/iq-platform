import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.adapters.outbound.persistence.database import Base
from app.domain.users import Role


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("uuidv7()")
    )
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="user_role"), server_default="user"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    policy_accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    policy_version: Mapped[str] = mapped_column(String)
