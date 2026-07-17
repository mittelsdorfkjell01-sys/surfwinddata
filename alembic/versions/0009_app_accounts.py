"""app accounts: app_users, favorites, submission ownership

Revision ID: 0009_app_accounts
Revises: 0008_board_tasks
Create Date: 2026-07-17

Public visitor accounts (surfwinddata.com) and the data they own: saved
favourites, plus a nullable owner link on the existing spot_submissions so a
logged-in proposal shows up under "Meine Spots".
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_app_accounts"
down_revision: Union[str, None] = "0008_board_tasks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.UniqueConstraint("email", name="uq_app_users_email"),
    )

    op.create_table(
        "favorites",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column("app_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("spot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["app_user_id"], ["app_users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["spot_id"], ["spots.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("app_user_id", "spot_id", name="uq_favorite_user_spot"),
    )
    op.create_index("ix_favorite_user", "favorites", ["app_user_id"])

    # Link a submission to its author when one was logged in. Nullable so
    # anonymous submissions (the existing community flow) keep working. No FK —
    # consistent with the other UGC app_user_id columns.
    op.add_column(
        "spot_submissions",
        sa.Column("app_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "ix_submission_app_user", "spot_submissions", ["app_user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_submission_app_user", table_name="spot_submissions")
    op.drop_column("spot_submissions", "app_user_id")
    op.drop_index("ix_favorite_user", table_name="favorites")
    op.drop_table("favorites")
    op.drop_table("app_users")
