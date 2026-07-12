"""moderation_audit: audit trail for moderation decisions (Sprint D)

Analogous to ``spot_audit`` but for non-spot-bound moderation actions
(submission/image approve-reject, tip/rating hide, report dismiss).

Revision ID: 0006_moderation_audit
Revises: 0005_ugc
Create Date: 2026-07-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_moderation_audit"
down_revision: Union[str, None] = "0005_ugc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "moderation_audit",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column("actor", sa.String(120), nullable=True),
        sa.Column("action", sa.String(60), nullable=False),
        sa.Column("target_type", sa.String(40), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
    )
    op.create_index(
        "ix_moderation_audit_target", "moderation_audit", ["target_type", "target_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_moderation_audit_target", table_name="moderation_audit")
    op.drop_table("moderation_audit")
