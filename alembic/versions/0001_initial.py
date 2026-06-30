"""initial schema: postgis + all Sprint 1 tables

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-29

"""
from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _geography(geom_type: str):
    # spatial_index=False: indexes are created explicitly below so this
    # migration owns them (no implicit GeoAlchemy2-generated index).
    return geoalchemy2.types.Geography(
        geometry_type=geom_type, srid=4326, spatial_index=False
    )


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # --- regions -----------------------------------------------------------
    op.create_table(
        "regions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=True),
        sa.Column("center", _geography("POINT"), nullable=True),
        sa.Column("bounds", _geography("POLYGON"), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image", postgresql.JSONB(), nullable=True),
        sa.Column("season", postgresql.JSONB(), nullable=True),
        sa.Column("defaults", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(
        "ix_regions_center", "regions", ["center"], postgresql_using="gist"
    )

    # --- spots -------------------------------------------------------------
    op.create_table(
        "spots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("region_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("location", _geography("POINT"), nullable=False),
        sa.Column("era5_cell", postgresql.JSONB(), nullable=True),
        sa.Column("model_pref", sa.String(length=50), nullable=True),
        sa.Column(
            "sports",
            postgresql.ARRAY(sa.String()),
            server_default=sa.text("'{}'::varchar[]"),
            nullable=False,
        ),
        sa.Column("water_type", sa.String(length=30), nullable=True),
        sa.Column("bottom_type", sa.String(length=30), nullable=True),
        sa.Column("level", sa.String(length=30), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'draft'"),
            nullable=False,
        ),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("facing", sa.SmallInteger(), nullable=True),
        sa.Column("editorial", postgresql.JSONB(), nullable=True),
        sa.Column("climatology", postgresql.JSONB(), nullable=True),
        sa.Column("overrides", postgresql.JSONB(), nullable=True),
        sa.Column("image", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["region_id"], ["regions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(
        "ix_spots_location", "spots", ["location"], postgresql_using="gist"
    )
    op.create_index("ix_spots_sports", "spots", ["sports"], postgresql_using="gin")
    op.create_index("ix_spots_region_status", "spots", ["region_id", "status"])
    op.create_index("ix_spots_water_level", "spots", ["water_type", "level"])

    # --- era5_jobs ---------------------------------------------------------
    op.create_table(
        "era5_jobs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("spot_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("region_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("cell", postgresql.JSONB(), nullable=True),
        sa.Column("params", postgresql.JSONB(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'queued'"),
            nullable=False,
        ),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["spot_id"], ["spots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["region_id"], ["regions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- watches -----------------------------------------------------------
    op.create_table(
        "watches",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_ref", sa.String(length=120), nullable=False),
        sa.Column("spot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "sports",
            postgresql.ARRAY(sa.String()),
            server_default=sa.text("'{}'::varchar[]"),
            nullable=False,
        ),
        sa.Column("conditions", postgresql.JSONB(), nullable=True),
        sa.Column(
            "channel",
            sa.String(length=30),
            server_default=sa.text("'email'"),
            nullable=False,
        ),
        sa.Column(
            "active", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["spot_id"], ["spots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_watches_user_ref", "watches", ["user_ref"])
    op.create_index("ix_watches_spot_active", "watches", ["spot_id", "active"])

    # --- notifications -----------------------------------------------------
    op.create_table(
        "notifications",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("watch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("spot_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["watch_id"], ["watches.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["spot_id"], ["spots.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_status", "notifications", ["status"])
    op.create_index("ix_notifications_watch", "notifications", ["watch_id"])

    # --- scoring_params ----------------------------------------------------
    op.create_table(
        "scoring_params",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("sport", sa.String(length=40), nullable=False),
        sa.Column(
            "version", sa.Integer(), server_default=sa.text("1"), nullable=False
        ),
        sa.Column(
            "active", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("params", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "sport", "version", name="uq_scoring_params_sport_version"
        ),
    )

    # --- spot_audit --------------------------------------------------------
    op.create_table(
        "spot_audit",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("spot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor", sa.String(length=120), nullable=True),
        sa.Column("action", sa.String(length=40), nullable=False),
        sa.Column("changes", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["spot_id"], ["spots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_spot_audit_spot", "spot_audit", ["spot_id", "created_at"])

    # --- required_fields ---------------------------------------------------
    op.create_table(
        "required_fields",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("entity", sa.String(length=40), nullable=False),
        sa.Column("field", sa.String(length=80), nullable=False),
        sa.Column("applies_when", postgresql.JSONB(), nullable=True),
        sa.Column(
            "severity",
            sa.String(length=20),
            server_default=sa.text("'required'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "entity", "field", name="uq_required_fields_entity_field"
        ),
    )


def downgrade() -> None:
    op.drop_table("required_fields")
    op.drop_index("ix_spot_audit_spot", table_name="spot_audit")
    op.drop_table("spot_audit")
    op.drop_table("scoring_params")
    op.drop_index("ix_notifications_watch", table_name="notifications")
    op.drop_index("ix_notifications_status", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_watches_spot_active", table_name="watches")
    op.drop_index("ix_watches_user_ref", table_name="watches")
    op.drop_table("watches")
    op.drop_table("era5_jobs")
    op.drop_index("ix_spots_water_level", table_name="spots")
    op.drop_index("ix_spots_region_status", table_name="spots")
    op.drop_index("ix_spots_sports", table_name="spots")
    op.drop_index("ix_spots_location", table_name="spots")
    op.drop_table("spots")
    op.drop_index("ix_regions_center", table_name="regions")
    op.drop_table("regions")
