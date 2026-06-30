"""Similarity search (Sprint 7).

Two deliberately separate notions of "similar", plus the practical alternatives
case:

  normalize_orientation(sectors, facing)   wind sectors -> onshore/side/offshore
                                            pattern relative to the coast, so
                                            mirrored coasts read as similar
  find_similar_spots(spot_id, mode, …)      mode 'charakter' (feel, via editorial),
                                            'saison' (correlated 52-week curves),
                                            'beides' (both combined)
  find_alternatives(spot_id, time_context)  character-similar spots that are
                                            *running now*, ranked score × distance

Reads ``spots.editorial`` / ``spots.facing`` / climatology score-curves only — no
new data source. Character similarity assumes maintained ``editorial``/``facing``
(Stage 2); the seed is filled accordingly.
"""

from app.similarity.character import character_distance
from app.similarity.orientation import normalize_orientation
from app.similarity.season import season_distance
from app.similarity.service import find_alternatives, find_similar_spots

__all__ = [
    "normalize_orientation",
    "character_distance",
    "season_distance",
    "find_similar_spots",
    "find_alternatives",
]
