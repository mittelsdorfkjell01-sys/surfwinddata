"""Pure similarity tests: orientation mirroring, character/season distance, the
three modes and alternatives. No DB, no network."""

from __future__ import annotations

from app.similarity.character import character_distance
from app.similarity.orientation import (
    normalize_orientation,
    orientation_l1,
    window_to_sectors,
)
from app.similarity.season import pearson, season_distance, season_distance_spots
from app.similarity.service import (
    MODE_BOTH,
    MODE_CHARACTER,
    MODE_SEASON,
    find_alternatives_core,
    find_similar_core,
)
from tests.search_helpers import FakeScorer, make_spot


def _kite_clim(good_weeks: set[int], good_sector: int = 1) -> dict:
    """Climatology whose 'good' wind sits in ``good_sector`` (so it must lie inside
    the spot's usable-direction window to actually count as usable)."""
    weeks = []
    for w in range(1, 53):
        joint = [[0] * 6 for _ in range(16)]
        joint[good_sector][3 if w in good_weeks else 0] = 10  # 16 kt good / 3 kt nein
        weeks.append({"week": w, "daylight_hours": 10,
                      "wind": {"joint": joint, "p50_kt": 16,
                               "dir_dominant_deg": good_sector * 22.5},
                      "swell": {}})
    return {"weeks": weeks}


def _flatwater(name, lat, lon, facing, usable, **kw):
    return make_spot(
        name, lat, lon, ["kitesurf"], slug=name.lower(),
        water_type="sea", bottom_type="sand", level="beginner", facing=facing,
        editorial={"usable_wind_directions": usable, "wind_range": [14, 24]}, **kw,
    )


# --- orientation -----------------------------------------------------------

def test_orientation_mirrored_coasts_match():
    # west-facing beach with N-NE wind vs east-facing beach with S-SW wind
    o1 = normalize_orientation(window_to_sectors({"min": 0, "max": 45}), 270)
    o2 = normalize_orientation(window_to_sectors({"min": 180, "max": 225}), 90)
    assert o1 == o2
    assert orientation_l1(o1, o2) == 0.0


def test_orientation_none_without_facing_or_sectors():
    assert normalize_orientation([0, 1], None) is None
    assert normalize_orientation([], 270) is None


def test_orientation_onshore_vs_offshore_differ():
    onshore = normalize_orientation(window_to_sectors({"min": 255, "max": 285}), 270)
    offshore = normalize_orientation(window_to_sectors({"min": 75, "max": 105}), 270)
    assert onshore["onshore"] > 0 and offshore["offshore"] > 0
    assert orientation_l1(onshore, offshore) > 0.5


# --- character distance ----------------------------------------------------

def test_character_recognises_mirrored_flatwater_spots():
    west = _flatwater("West", 54.4, 10.2, 270, {"min": 0, "max": 45})
    east = _flatwater("East", 43.0, 5.0, 90, {"min": 180, "max": 225})
    reef = make_spot(
        "Reef", 54.4, 10.3, ["surf"], slug="reef",
        water_type="ocean", bottom_type="reef", level="advanced", facing=300,
        editorial={"usable_wind_directions": {"min": 100, "max": 140}, "wind_range": [22, 35]},
    )
    d_mirror = character_distance(west, east)
    d_diff = character_distance(west, reef)
    assert d_mirror < 0.1          # functionally identical despite mirrored coast
    assert d_mirror < d_diff
    assert d_diff > 0.5


def test_character_skips_missing_features():
    a = make_spot("A", 54.4, 10.2, ["kitesurf"], water_type="sea")
    b = make_spot("B", 54.4, 10.3, ["kitesurf"], water_type="sea")
    # only water_type comparable (equal) -> distance 0
    assert character_distance(a, b) == 0.0


# --- season distance -------------------------------------------------------

def test_season_correlation_and_anti():
    summer = [1.0 if 23 <= w <= 30 else 0.0 for w in range(1, 53)]
    summer2 = [1.0 if 24 <= w <= 31 else 0.0 for w in range(1, 53)]
    winter = [1.0 if 1 <= w <= 8 else 0.0 for w in range(1, 53)]
    assert season_distance(summer, summer2) < 0.2     # same season -> close
    assert season_distance(summer, winter) > 0.5      # opposite -> far


def test_season_distance_constant_curve_is_neutral():
    flat = [0.0] * 52
    assert season_distance(flat, [1.0 if w < 10 else 0.0 for w in range(52)]) == 0.5


# --- the three modes -------------------------------------------------------

def test_modes_rank_by_their_own_dimension():
    target = _flatwater("Target", 54.4, 10.2, 270, {"min": 0, "max": 45},
                        climatology=_kite_clim(set(range(23, 31))))  # summer
    # same character (mirror), opposite season — good wind in its S-SW window
    char_twin = _flatwater("CharTwin", 43.0, 5.0, 90, {"min": 180, "max": 225},
                           climatology=_kite_clim(set(range(1, 9)), good_sector=9))
    # different character, same season — good wind in its E-SE window
    season_twin = make_spot(
        "SeasonTwin", 54.4, 10.9, ["kitesurf"], slug="seasontwin",
        water_type="ocean", bottom_type="reef", level="advanced", facing=120,
        editorial={"usable_wind_directions": {"min": 90, "max": 130}, "wind_range": [24, 35]},
        climatology=_kite_clim(set(range(23, 31)), good_sector=5),  # summer
    )
    cands = [char_twin, season_twin]

    by_char = find_similar_core(target, cands, MODE_CHARACTER, "kitesurf")
    assert by_char[0]["spot"].slug == "chartwin"

    by_season = find_similar_core(target, cands, MODE_SEASON, "kitesurf")
    assert by_season[0]["spot"].slug == "seasontwin"

    both = find_similar_core(target, cands, MODE_BOTH, "kitesurf")
    assert {r["spot"].slug for r in both} == {"chartwin", "seasontwin"}
    assert all(r["character"] is not None and r["season"] is not None for r in both)


# --- alternatives ----------------------------------------------------------

def test_alternatives_only_running_spots():
    target = _flatwater("Target", 54.40, 10.20, 270, {"min": 0, "max": 45},
                        climatology=_kite_clim({1}))
    running_near = _flatwater("RunNear", 54.45, 10.25, 270, {"min": 0, "max": 45},
                              climatology=_kite_clim({1}))      # good in week 1
    running_far = _flatwater("RunFar", 54.70, 10.80, 270, {"min": 0, "max": 45},
                             climatology=_kite_clim({1}))
    idle = _flatwater("Idle", 54.46, 10.26, 270, {"min": 0, "max": 45},
                      climatology=_kite_clim({30}))             # not good in week 1

    scorer = FakeScorer({"runnear": 0.6, "runfar": 0.9}, default=0.5)
    ranked = find_alternatives_core(
        target, [running_near, running_far, idle], week=1, sport="kitesurf",
        profile=None, scorer=scorer, d0_km=40.0, threshold=0.40,
    )
    slugs = [r["spot"].slug for r in ranked]
    assert "idle" not in slugs                # filtered: not running in week 1
    assert set(slugs) == {"runnear", "runfar"}
    assert all(r["character"] is not None for r in ranked)
    # ranked by score × distance decay, descending
    rs = [r["rank_score"] for r in ranked]
    assert rs == sorted(rs, reverse=True)
