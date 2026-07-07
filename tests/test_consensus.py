"""Pure unit tests for the multi-model consensus statistics (Sprint 18, Phase 1)."""

from __future__ import annotations

from app.live.consensus import confidence_from_spread, spread


def test_spread_median_low_high_n():
    assert spread([10.0, 14.0, 18.0]) == {
        "median": 14.0,
        "low": 10.0,
        "high": 18.0,
        "n": 3,
    }


def test_spread_even_count_median_is_mean_of_middle_two():
    s = spread([10.0, 12.0, 14.0, 16.0])
    assert s["median"] == 13.0
    assert (s["low"], s["high"], s["n"]) == (10.0, 16.0, 4)


def test_spread_ignores_none_and_non_numeric():
    assert spread([None, 20.0, None, 22.0, "x", True]) == {
        "median": 21.0,
        "low": 20.0,
        "high": 22.0,
        "n": 2,
    }


def test_spread_all_missing_returns_none():
    assert spread([None, None]) is None
    assert spread([]) is None


def test_confidence_from_spread_tiers():
    assert confidence_from_spread(0.0) == "hoch"
    assert confidence_from_spread(6.0) == "hoch"
    assert confidence_from_spread(6.01) == "mittel"
    assert confidence_from_spread(12.0) == "mittel"
    assert confidence_from_spread(12.01) == "niedrig"
    assert confidence_from_spread(30.0) == "niedrig"


def test_confidence_from_spread_unknown():
    assert confidence_from_spread(None) is None
