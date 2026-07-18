"""Discovery: the "aktuelle Top Spots" ranking.

Ranks published spots by a blend of this week's wind forecast, today's
conditions and community popularity, with a date-seeded jitter so the set
rotates day to day. See :mod:`app.discovery.featured` (pure scoring) and
:mod:`app.discovery.service` (DB + forecast orchestration + day cache).
"""

from app.discovery.service import top_spot_ids

__all__ = ["top_spot_ids"]
