"""era5_jobs: add raw_path, default status to 'queued'

Sprint 2 — the climatology pipeline stores the downloaded ERA5 extract on disk
(Parquet) and re-reads it during recompute, so the job needs a ``raw_path``.
The status vocabulary also moves to the Sprint 2 lifecycle
(queued -> extracting -> derived | failed); the column default follows.

Revision ID: 0002_era5_raw_path
Revises: 0001_initial
Create Date: 2026-06-29

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_era5_raw_path"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("era5_jobs", sa.Column("raw_path", sa.Text(), nullable=True))
    op.alter_column(
        "era5_jobs",
        "status",
        server_default=sa.text("'queued'"),
        existing_type=sa.String(length=20),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "era5_jobs",
        "status",
        server_default=sa.text("'pending'"),
        existing_type=sa.String(length=20),
        existing_nullable=False,
    )
    op.drop_column("era5_jobs", "raw_path")
