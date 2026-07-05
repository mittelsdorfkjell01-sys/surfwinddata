"""spots: add water_character, style, facilities category axes

Sprint 1 (categories & facilities) — three validated category axes on top of the
existing structural columns:

* ``water_character`` — Wasserart (distinct from ``water_type``), nullable.
* ``style`` — Fahrstil, a multi-select ``varchar[]`` with a GIN index (mirrors
  ``ix_spots_sports``) so ``style && ARRAY[...]`` overlap filters stay fast.
* ``facilities`` — JSONB ``{kind: {"available": bool, "note"?: str}}``; a missing
  kind means "unknown".

Revision ID: 0003_spot_categories_facilities
Revises: 0002_era5_raw_path
Create Date: 2026-07-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_spot_categories_facilities"
down_revision: Union[str, None] = "0002_era5_raw_path"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "spots", sa.Column("water_character", sa.String(length=30), nullable=True)
    )
    op.add_column(
        "spots",
        sa.Column(
            "style",
            postgresql.ARRAY(sa.String()),
            server_default=sa.text("'{}'::varchar[]"),
            nullable=False,
        ),
    )
    op.add_column(
        "spots", sa.Column("facilities", postgresql.JSONB(), nullable=True)
    )
    op.create_index("ix_spots_style", "spots", ["style"], postgresql_using="gin")


def downgrade() -> None:
    op.drop_index("ix_spots_style", table_name="spots")
    op.drop_column("spots", "facilities")
    op.drop_column("spots", "style")
    op.drop_column("spots", "water_character")
