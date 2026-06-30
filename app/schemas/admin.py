"""Request schemas for the admin write endpoints (Sprint 8)."""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field


class SpotCreate(BaseModel):
    name: str
    region_id: uuid.UUID
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    sports: list[str] = Field(default_factory=list)
    slug: str | None = None
    water_type: str | None = None
    bottom_type: str | None = None
    level: str | None = None
    facing: int | None = Field(default=None, ge=0, le=359)
    model_pref: str | None = None
    editorial: dict[str, Any] | None = None

    def to_data(self) -> dict:
        return self.model_dump(exclude_none=False)


class MetadataUpdate(BaseModel):
    """Editorial fields to merge. Each value may be a real value or ``"n/a"``."""

    editorial: dict[str, Any]


class OverrideRequest(BaseModel):
    field: str
    value: Any


class RevertRequest(BaseModel):
    field: str


class ImageRequest(BaseModel):
    url: str
    source: str
    license: str
    credit: str

    def to_image(self) -> dict:
        return self.model_dump()


class RegionCreate(BaseModel):
    name: str
    slug: str | None = None
    country: str | None = None
    lat: float | None = None
    lon: float | None = None
    description: str | None = None
    defaults: dict[str, Any] | None = None
    season: dict[str, Any] | None = None

    def to_data(self) -> dict:
        return self.model_dump(exclude_none=False)


class RegionDefaultsUpdate(BaseModel):
    defaults: dict[str, Any]


class AssignRegionRequest(BaseModel):
    region_id: uuid.UUID
