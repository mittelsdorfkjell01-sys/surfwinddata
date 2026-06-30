"""Shared admin constants."""

from __future__ import annotations

# Sentinel a curator sets when a field genuinely does not apply; it counts as
# *fulfilled* for readiness (an explicit "not applicable", not a missing value).
NA = "n/a"

# Spot lifecycle. The column keeps the project's English vocabulary; "entwurf" and
# "live" in the prompt map to these.
STATUS_DRAFT = "draft"       # entwurf
STATUS_LIVE = "published"    # live
STATUS_ARCHIVED = "archived"


def is_na(value) -> bool:
    return isinstance(value, str) and value.strip().lower() == NA
