"""Lightweight content term filter for UGC (tips/ratings).

Not a hard block — a match sets ``flagged=True`` so the item still publishes
(post-moderation) but surfaces first in the admin review panel. Built-in signals
catch obvious spam/links; operators add domain terms via ``BANNED_WORDS``.
"""

from __future__ import annotations

from app.config import get_settings

# Built-in spam/link indicators (uncontroversial). Substring, case-insensitive.
_BUILTIN = (
    "http://", "https://", "www.", ".com", ".net", ".ru",
    "casino", "viagra", "bitcoin", "crypto", "telegram", "whatsapp +",
)


def _terms() -> list[str]:
    extra = [
        w.strip().lower()
        for w in (get_settings().banned_words or "").split(",")
        if w.strip()
    ]
    return list(_BUILTIN) + extra


def is_flagged(*texts: str | None) -> bool:
    """True if any text contains a built-in or configured flag term."""
    blob = " ".join(t for t in texts if t).lower()
    if not blob:
        return False
    return any(term in blob for term in _terms())
