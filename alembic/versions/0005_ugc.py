"""ugc: ratings, local tips, spot submissions, images, image reports (Sprint C)

The community layer. All content tables cascade from ``spots`` (submissions use
SET NULL on ``resulting_spot_id``). Pseudonymous authorship, moderation status
columns, and inline license provenance on images.

Revision ID: 0005_ugc
Revises: 0004_admin_users
Create Date: 2026-07-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_ugc"
down_revision: Union[str, None] = "0004_admin_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UUID = postgresql.UUID(as_uuid=True)
_PK = dict(server_default=sa.text("gen_random_uuid()"), primary_key=True)
_TS = lambda name: sa.Column(  # noqa: E731
    name, sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
)


def upgrade() -> None:
    op.create_table(
        "spot_ratings",
        sa.Column("id", _UUID, **_PK),
        sa.Column("spot_id", _UUID, sa.ForeignKey("spots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stars", sa.SmallInteger(), nullable=False),
        sa.Column("skill_level", sa.String(20), nullable=False),
        sa.Column("sport", sa.String(20), nullable=False),
        sa.Column("conditions", sa.Text(), nullable=False),
        sa.Column("author_name", sa.String(120), nullable=False),
        sa.Column("author_email", sa.String(255), nullable=True),
        sa.Column("app_user_id", _UUID, nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'published'"), nullable=False),
        sa.Column("flagged", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        _TS("created_at"),
        _TS("updated_at"),
        sa.CheckConstraint("stars >= 1 AND stars <= 5", name="ck_rating_stars_1_5"),
    )
    op.create_index("ix_rating_spot", "spot_ratings", ["spot_id"])

    op.create_table(
        "local_tips",
        sa.Column("id", _UUID, **_PK),
        sa.Column("spot_id", _UUID, sa.ForeignKey("spots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("author_name", sa.String(120), nullable=False),
        sa.Column("author_email", sa.String(255), nullable=True),
        sa.Column("app_user_id", _UUID, nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'published'"), nullable=False),
        sa.Column("flagged", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        _TS("created_at"),
        _TS("updated_at"),
    )
    op.create_index("ix_tip_spot", "local_tips", ["spot_id"])

    op.create_table(
        "spot_submissions",
        sa.Column("id", _UUID, **_PK),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("submitter_name", sa.String(120), nullable=False),
        sa.Column("submitter_email", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.String(120), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resulting_spot_id", _UUID, sa.ForeignKey("spots.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        _TS("created_at"),
        _TS("updated_at"),
    )
    op.create_index("ix_submission_status", "spot_submissions", ["status"])

    op.create_table(
        "spot_images",
        sa.Column("id", _UUID, **_PK),
        sa.Column("spot_id", _UUID, sa.ForeignKey("spots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(30), server_default=sa.text("'user_upload'"), nullable=False),
        sa.Column("credit", sa.String(200), nullable=True),
        sa.Column("submitter_email", sa.String(255), nullable=True),
        sa.Column("app_user_id", _UUID, nullable=True),
        sa.Column("license_version", sa.String(20), nullable=False),
        sa.Column("license_accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("report_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("reviewed_by", sa.String(120), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        _TS("created_at"),
        _TS("updated_at"),
    )
    op.create_index("ix_image_spot_status", "spot_images", ["spot_id", "status"])

    op.create_table(
        "image_reports",
        sa.Column("id", _UUID, **_PK),
        sa.Column("image_id", _UUID, sa.ForeignKey("spot_images.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.String(30), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("reporter_email", sa.String(255), nullable=True),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        _TS("created_at"),
        _TS("updated_at"),
    )
    op.create_index("ix_image_report_image", "image_reports", ["image_id"])


def downgrade() -> None:
    op.drop_index("ix_image_report_image", table_name="image_reports")
    op.drop_table("image_reports")
    op.drop_index("ix_image_spot_status", table_name="spot_images")
    op.drop_table("spot_images")
    op.drop_index("ix_submission_status", table_name="spot_submissions")
    op.drop_table("spot_submissions")
    op.drop_index("ix_tip_spot", table_name="local_tips")
    op.drop_table("local_tips")
    op.drop_index("ix_rating_spot", table_name="spot_ratings")
    op.drop_table("spot_ratings")
