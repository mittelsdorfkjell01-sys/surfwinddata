"""Append-only audit trail for spot changes."""

from __future__ import annotations


def record_audit(db, spot_id, action: str, changes: dict | None, actor: str | None):
    """Add a ``spot_audit`` row (no commit — the caller owns the transaction)."""
    from app.models import SpotAudit

    entry = SpotAudit(spot_id=spot_id, action=action, changes=changes, actor=actor)
    db.add(entry)
    db.flush()
    return entry
