"""Read-overlay helper.

A spot has a set of *auto* fields that will, in later sprints, be computed from
climatology / scoring. Editors can pin manual values in the ``overrides`` JSONB
column. ``apply_overrides`` produces the effective read view by laying the
overrides on top of the auto-computed values.

In Sprint 1 there is no climatology yet, so this is mostly a scaffold: it merges
``overrides`` onto whatever auto-fields we can already derive, and records which
fields were overridden so the API/UI can flag them later.
"""

from copy import deepcopy
from typing import Any

# Fields that may be overridden by editors. Kept explicit so an arbitrary
# overrides blob can't shadow unrelated attributes.
OVERRIDABLE_FIELDS: tuple[str, ...] = (
    "name",
    "water_type",
    "bottom_type",
    "level",
    "facing",
    "sports",
    "model_pref",
    "confidence",
    "editorial",
    "climatology",
    "image",
)


def _auto_fields(spot: Any) -> dict[str, Any]:
    """The auto-computed baseline for a spot.

    Later sprints will derive parts of this from climatology/scoring. For now it
    is simply the stored column values for each overridable field.
    """
    return {field: getattr(spot, field, None) for field in OVERRIDABLE_FIELDS}


def apply_overrides(spot: Any) -> dict[str, Any]:
    """Return the effective field values for a spot with overrides applied.

    The result is a plain dict of ``{field: effective_value}`` plus a special
    ``_overridden`` key listing which fields came from ``overrides``.
    """
    auto = _auto_fields(spot)
    overrides = getattr(spot, "overrides", None) or {}

    effective = deepcopy(auto)
    overridden: list[str] = []
    for field, value in overrides.items():
        if field not in OVERRIDABLE_FIELDS:
            continue
        effective[field] = value
        overridden.append(field)

    effective["_overridden"] = sorted(overridden)
    return effective


# Provenance label shown for editor-pinned values (Sprint 8).
PROVENANCE_OVERRIDDEN = "überschrieben"
PROVENANCE_AUTO = "auto"


def apply_overrides_with_provenance(spot: Any) -> dict[str, Any]:
    """Like :func:`apply_overrides` but with a per-field provenance map.

    Returns ``{"fields": {field: value}, "provenance": {field: "überschrieben" |
    "auto"}, "_overridden": [...]}`` so read endpoints can flag editor-pinned
    values (the original auto value stays in the column and is reachable).
    """
    effective = apply_overrides(spot)
    overridden = set(effective.pop("_overridden"))
    provenance = {
        field: (PROVENANCE_OVERRIDDEN if field in overridden else PROVENANCE_AUTO)
        for field in OVERRIDABLE_FIELDS
    }
    return {
        "fields": effective,
        "provenance": provenance,
        "_overridden": sorted(overridden),
    }
