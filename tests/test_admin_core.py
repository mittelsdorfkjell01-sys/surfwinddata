"""Pure admin tests: readiness rules, n/a handling, provenance, stock seam. No DB."""

from __future__ import annotations

from types import SimpleNamespace

from app.admin.readiness import (
    REQUIRED_FIELDS_V1,
    applies,
    build_checklist,
    climatology_ready,
    image_ready,
    is_fulfilled,
    resolve_field,
)
from app.admin.regions import fetch_region_stock_image
from app.services.overrides import apply_overrides_with_provenance

_IMAGE = {"url": "u", "source": "unsplash", "license": "Unsplash License", "credit": "Jo"}


def _spot(**kw):
    base = dict(
        sports=["kitesurf"], water_type="sea", bottom_type="sand", level="beginner",
        facing=45, editorial=None, climatology=None, image=None, overrides=None,
        name="X", model_pref=None, confidence=None,
    )
    base.update(kw)
    return SimpleNamespace(**base)


# --- applies_when ----------------------------------------------------------

def test_applies_when_matching():
    assert applies(None, ["kitesurf"]) is True
    assert applies({"sports_any": ["surf"]}, ["kitesurf"]) is False
    assert applies({"sports_any": ["surf", "kitesurf"]}, ["kitesurf"]) is True
    assert applies({"sport": "surf"}, ["surf"]) is True


# --- n/a handling ----------------------------------------------------------

def test_is_fulfilled_value_or_na():
    assert is_fulfilled("sand") is True
    assert is_fulfilled("n/a") is True          # explicit not-applicable counts
    assert is_fulfilled("N/A") is True
    assert is_fulfilled(None) is False
    assert is_fulfilled("") is False
    assert is_fulfilled({}) is False
    assert is_fulfilled({"min": 0}) is True


def test_resolve_field_column_and_editorial_path():
    spot = _spot(editorial={"description": "nice"})
    assert resolve_field(spot, "water_type") == "sea"
    assert resolve_field(spot, "editorial.description") == "nice"
    assert resolve_field(spot, "editorial.missing") is None


# --- image / climatology gates ---------------------------------------------

def test_image_ready_requires_all_rights():
    assert image_ready(_IMAGE) is True
    assert image_ready({"url": "u", "credit": "Jo"}) is False
    assert image_ready(None) is False


def test_climatology_ready_via_weeks_or_job():
    assert climatology_ready(_spot(climatology={"weeks": [1]}), None) is True
    assert climatology_ready(_spot(), "derived") is True
    assert climatology_ready(_spot(), "queued") is False


# --- full checklist --------------------------------------------------------

def test_checklist_not_ready_lists_gaps():
    spot = _spot(editorial={"description": "x", "usable_wind_directions": {"min": 0, "max": 45}})
    r = build_checklist(spot, REQUIRED_FIELDS_V1, job_status=None)
    assert r["ready"] is False
    assert "climatology" in r["gaps"] and "image" in r["gaps"]


def test_checklist_ready_with_na_counting():
    spot = _spot(
        bottom_type="n/a",  # not applicable, but counts as fulfilled
        editorial={"description": "x", "usable_wind_directions": {"min": 0, "max": 45}},
        climatology={"weeks": [1]},
        image=_IMAGE,
    )
    r = build_checklist(spot, REQUIRED_FIELDS_V1, job_status="derived")
    assert r["ready"] is True
    assert r["gaps"] == []


def test_checklist_surf_requires_tide():
    spot = _spot(
        sports=["surf"], editorial={"description": "x"},  # no tide
        climatology={"weeks": [1]}, image=_IMAGE,
    )
    r = build_checklist(spot, REQUIRED_FIELDS_V1)
    assert "editorial.tide" in r["gaps"]
    # usable_wind_directions is NOT required for a pure surf spot
    assert "editorial.usable_wind_directions" not in r["gaps"]


# --- provenance ------------------------------------------------------------

def test_provenance_marks_overridden_fields():
    spot = _spot(level="beginner", overrides={"level": "expert"})
    view = apply_overrides_with_provenance(spot)
    assert view["fields"]["level"] == "expert"
    assert view["provenance"]["level"] == "überschrieben"
    assert view["provenance"]["water_type"] == "auto"
    assert view["_overridden"] == ["level"]


# --- stock seam ------------------------------------------------------------

def test_fetch_region_stock_image_uses_client():
    class FakeStock:
        def search(self, query):
            return {"url": f"img/{query}", "source": "unsplash",
                    "license": "Unsplash License", "credit": "Jo"}

    img = fetch_region_stock_image("Tarifa", client=FakeStock())
    assert img["url"] == "img/Tarifa"
    assert img["license"] and img["credit"]
