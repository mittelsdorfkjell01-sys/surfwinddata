"""Pure-function tests for the featured Top-Spots ranking (no DB, no HTTP)."""

from __future__ import annotations

import uuid
from datetime import date

from app.discovery import featured


# --- day_quality -----------------------------------------------------------

def test_day_quality_all_gut_is_one():
    assert featured.day_quality(1.0, 1.0) == 1.0


def test_day_quality_none_usable_is_zero():
    assert featured.day_quality(0.0, 0.0) == 0.0


def test_day_quality_maessig_gets_partial_credit():
    # half the day merely usable, none "gut" -> 0.5 * MAESSIG_CREDIT
    q = featured.day_quality(0.5, 0.0)
    assert q == 0.5 * featured.MAESSIG_CREDIT


def test_day_quality_gut_beats_equal_share_of_maessig():
    assert featured.day_quality(0.5, 0.5) > featured.day_quality(0.5, 0.0)


# --- week / today ----------------------------------------------------------

def test_week_wind_is_mean_of_days():
    assert featured.week_wind_score([1.0, 0.0, 0.5, 0.5]) == 0.5


def test_week_wind_empty_is_zero():
    assert featured.week_wind_score([]) == 0.0


def test_today_is_first_day():
    assert featured.today_score([0.8, 0.1, 0.1]) == 0.8
    assert featured.today_score([]) == 0.0


# --- popularity ------------------------------------------------------------

def test_popularity_bounded_unit_interval():
    assert featured.popularity_score(5.0, 1000, 1000) <= 1.0
    assert featured.popularity_score(1.0, 0, 0) >= 0.0


def test_popularity_rises_with_rating():
    low = featured.popularity_score(2.0, 3, 3)
    high = featured.popularity_score(4.5, 3, 3)
    assert high > low


def test_popularity_rises_with_engagement():
    quiet = featured.popularity_score(3.5, 0, 0)
    busy = featured.popularity_score(3.5, 10, 10)
    assert busy > quiet


# --- daily seed ------------------------------------------------------------

def test_daily_seed_in_unit_interval():
    s = featured.daily_seed(uuid.uuid4(), date(2026, 7, 18))
    assert 0.0 <= s < 1.0


def test_daily_seed_stable_within_day():
    sid = uuid.uuid4()
    assert featured.daily_seed(sid, date(2026, 7, 18)) == featured.daily_seed(
        sid, date(2026, 7, 18)
    )


def test_daily_seed_changes_across_days():
    sid = uuid.uuid4()
    assert featured.daily_seed(sid, date(2026, 7, 18)) != featured.daily_seed(
        sid, date(2026, 7, 19)
    )


# --- rank ------------------------------------------------------------------

def _cand(sid, week_wind=0.0, today=0.0, popularity=0.0, seed=0.0):
    return {
        "spot_id": sid,
        "week_wind": week_wind,
        "today": today,
        "popularity": popularity,
        "seed": seed,
    }


def test_rank_orders_by_score_desc():
    a = _cand("a", week_wind=1.0)
    b = _cand("b", week_wind=0.2)
    ranked = featured.rank([b, a])
    assert [r["spot_id"] for r in ranked] == ["a", "b"]
    assert ranked[0]["score"] > ranked[1]["score"]


def test_rank_wind_outweighs_popularity():
    windy = _cand("windy", week_wind=1.0)
    loved = _cand("loved", popularity=1.0, seed=1.0)
    ranked = featured.rank([loved, windy])
    assert ranked[0]["spot_id"] == "windy"


def test_rank_is_deterministic_on_ties():
    # identical scores -> deterministic tiebreak (seed then id), order preserved
    a = _cand("a", seed=0.5)
    b = _cand("b", seed=0.5)
    first = [r["spot_id"] for r in featured.rank([a, b])]
    second = [r["spot_id"] for r in featured.rank([b, a])]
    assert first == second


def test_weights_sum_to_one():
    total = (
        featured.W_WEEK + featured.W_TODAY + featured.W_POPULARITY + featured.W_SEED
    )
    assert abs(total - 1.0) < 1e-9
