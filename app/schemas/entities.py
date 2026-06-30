"""Read schemas for the remaining entities. These tables carry no data yet in
Sprint 1, but the schemas are defined so later sprints can expose them directly."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class Era5JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    spot_id: uuid.UUID | None = None
    region_id: uuid.UUID | None = None
    cell: dict[str, Any] | None = None
    params: dict[str, Any] | None = None
    status: str
    error: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class WatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_ref: str
    spot_id: uuid.UUID
    sports: list[str]
    conditions: dict[str, Any] | None = None
    channel: str
    active: bool
    created_at: datetime
    updated_at: datetime


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    watch_id: uuid.UUID | None = None
    spot_id: uuid.UUID | None = None
    type: str
    payload: dict[str, Any] | None = None
    status: str
    sent_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ScoringParamsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sport: str
    version: int
    active: bool
    params: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class SpotAuditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    spot_id: uuid.UUID
    actor: str | None = None
    action: str
    changes: dict[str, Any] | None = None
    created_at: datetime


class RequiredFieldRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entity: str
    field: str
    applies_when: dict[str, Any] | None = None
    severity: str
    created_at: datetime
    updated_at: datetime
