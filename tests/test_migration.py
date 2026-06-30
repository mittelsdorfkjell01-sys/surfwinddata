from sqlalchemy import inspect, text

EXPECTED_TABLES = {
    "regions",
    "spots",
    "era5_jobs",
    "watches",
    "notifications",
    "scoring_params",
    "spot_audit",
    "required_fields",
}


def test_all_tables_created(db):
    inspector = inspect(db.get_bind())
    tables = set(inspector.get_table_names())
    assert EXPECTED_TABLES.issubset(tables)


def test_postgis_enabled(db):
    version = db.execute(text("SELECT PostGIS_Version()")).scalar()
    assert version  # non-empty version string


def test_geography_columns_present(db):
    rows = db.execute(
        text(
            "SELECT f_table_name, f_geography_column "
            "FROM geography_columns "
            "WHERE f_table_name IN ('spots', 'regions')"
        )
    ).all()
    cols = {(t, c) for t, c in rows}
    assert ("spots", "location") in cols
    assert ("regions", "center") in cols
    assert ("regions", "bounds") in cols


def test_spatial_indexes_exist(db):
    rows = db.execute(
        text("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")
    ).scalars().all()
    names = set(rows)
    for expected in {
        "ix_spots_location",
        "ix_spots_sports",
        "ix_spots_region_status",
        "ix_spots_water_level",
        "ix_regions_center",
    }:
        assert expected in names
