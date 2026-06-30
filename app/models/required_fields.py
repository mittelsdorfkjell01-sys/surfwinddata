import uuid

from sqlalchemy import String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class RequiredField(Base, TimestampMixin):
    """Declarative completeness rules: which fields an entity must have, optionally conditional."""

    __tablename__ = "required_fields"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    entity: Mapped[str] = mapped_column(String(40), nullable=False)  # e.g. "spot"
    field: Mapped[str] = mapped_column(String(80), nullable=False)
    # Optional JSON predicate describing when the field is required
    # (e.g. {"status": "published"}). Null => always required.
    applies_when: Mapped[dict | None] = mapped_column(JSONB)
    severity: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'required'")
    )  # required | recommended

    __table_args__ = (
        UniqueConstraint("entity", "field", name="uq_required_fields_entity_field"),
    )
