import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Era5Job(Base, TimestampMixin):
    """Tracks ERA5 climatology download/processing jobs (executed in a later sprint)."""

    __tablename__ = "era5_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    spot_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spots.id", ondelete="CASCADE")
    )
    region_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regions.id", ondelete="CASCADE")
    )

    cell: Mapped[dict | None] = mapped_column(JSONB)
    params: Mapped[dict | None] = mapped_column(JSONB)

    # Local/object-store path of the downloaded ERA5 raw extract (Parquet),
    # written by poll_cds_job and re-read by recompute_climatology.
    raw_path: Mapped[str | None] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'queued'")
    )  # queued -> extracting -> derived | failed
    error: Mapped[str | None] = mapped_column(Text)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
