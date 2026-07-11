"""admin_users: real operator accounts (Sprint A auth)

Introduces role-based admin/curator accounts that replace the shared
``X-Admin-Key``. Email is unique; a partial-less unique constraint is enough
because the application lower-cases emails before insert/lookup.

Revision ID: 0004_admin_users
Revises: 0003_spot_categories_facilities
Create Date: 2026-07-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_admin_users"
down_revision: Union[str, None] = "0003_spot_categories_facilities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column(
            "role", sa.String(length=20), server_default=sa.text("'curator'"), nullable=False
        ),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
    )
    op.create_unique_constraint("uq_admin_users_email", "admin_users", ["email"])


def downgrade() -> None:
    op.drop_constraint("uq_admin_users_email", "admin_users", type_="unique")
    op.drop_table("admin_users")
