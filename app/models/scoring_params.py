import uuid

from sqlalchemy import Boolean, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class ScoringParams(Base, TimestampMixin):
    """Versioned parameter sets for the per-sport scoring model (used in a later sprint)."""

    __tablename__ = "scoring_params"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    sport: Mapped[str] = mapped_column(String(40), nullable=False)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1")
    )
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    params: Mapped[dict] = mapped_column(JSONB, nullable=False)

    __table_args__ = (
        UniqueConstraint("sport", "version", name="uq_scoring_params_sport_version"),
    )
