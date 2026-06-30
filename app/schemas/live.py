"""Read schemas for the live + forecast endpoints (Sprint 3)."""

from __future__ import annotations

import uuid

from pydantic import BaseModel


class CurrentConditions(BaseModel):
    wind: float | None = None       # knots
    gust: float | None = None       # knots
    dir: float | None = None        # degrees, wind direction
    air: float | None = None        # deg C
    sst: float | None = None        # deg C
    swell: float | None = None      # m
    period: float | None = None     # s
    swell_dir: float | None = None  # degrees


class LiveConditionsRead(BaseModel):
    spot_id: uuid.UUID
    model: str
    time: str | None = None
    current: CurrentConditions


class ForecastHour(BaseModel):
    time: str
    wind: float | None = None
    gust: float | None = None
    dir: float | None = None
    air: float | None = None
    swell: float | None = None
    period: float | None = None
    swell_dir: float | None = None


class ForecastDaySummary(BaseModel):
    wind_avg: float | None = None
    wind_max: float | None = None
    gust_max: float | None = None
    air_min: float | None = None
    air_max: float | None = None
    swell_max: float | None = None


class ForecastDay(BaseModel):
    date: str
    confidence: str  # hoch | mittel | niedrig
    summary: ForecastDaySummary
    hours: list[ForecastHour]


class ForecastSeriesRead(BaseModel):
    spot_id: uuid.UUID
    model: str
    generated_at: str
    days: list[ForecastDay]
