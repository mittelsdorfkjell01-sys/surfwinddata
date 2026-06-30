import uuid

from sqlalchemy import Boolean, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Watch(Base, TimestampMixin):
    """A user's saved alert: notify when a spot meets given conditions."""

    __tablename__ = "watches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    # No users table in Sprint 1 — opaque reference to the owning user.
    user_ref: Mapped[str] = mapped_column(String(120), nullable=False)

    spot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spots.id", ondelete="CASCADE"), nullable=False
    )
    sports: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default=text("'{}'::varchar[]")
    )
    conditions: Mapped[dict | None] = mapped_column(JSONB)
    channel: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default=text("'email'")
    )  # email | push | webhook
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )

    __table_args__ = (
        Index("ix_watches_user_ref", "user_ref"),
        Index("ix_watches_spot_active", "spot_id", "active"),
    )
