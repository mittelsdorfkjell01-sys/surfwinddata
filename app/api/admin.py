"""Admin write endpoints (Sprint 8). Optionally gated by the ADMIN_KEY header."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.admin import regions as admin_regions
from app.admin import spots as admin_spots
from app.admin.deps import get_cds_client, get_stock_client, require_admin
from app.admin.jobs import get_job_status, trigger_era5_job
from app.admin.readiness import validate_spot_readiness
from app.admin.spots import NotReadyError
from app.db.session import get_db
from app.schemas import RegionRead, SpotRead
from app.schemas.admin import (
    AssignRegionRequest,
    ImageRequest,
    MetadataUpdate,
    OverrideRequest,
    RegionCreate,
    RegionDefaultsUpdate,
    RevertRequest,
    SpotCreate,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _actor(x_admin_actor: str | None) -> str:
    return x_admin_actor or "admin"


# --- spots -----------------------------------------------------------------

@router.post("/spots", response_model=SpotRead, status_code=201)
def create_spot(
    body: SpotCreate,
    db: Session = Depends(get_db),
    client=Depends(get_cds_client),
    x_admin_actor: str | None = Header(default=None),
):
    try:
        spot = admin_spots.create_spot(
            body.to_data(), db=db, client=client, actor=_actor(x_admin_actor)
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return SpotRead.from_orm_spot(spot)


@router.patch("/spots/{spot_id}", response_model=SpotRead)
def update_metadata(
    spot_id: uuid.UUID,
    body: MetadataUpdate,
    db: Session = Depends(get_db),
    x_admin_actor: str | None = Header(default=None),
):
    try:
        spot = admin_spots.update_spot_metadata(
            spot_id, body.editorial, db=db, actor=_actor(x_admin_actor)
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Spot not found")
    return SpotRead.from_orm_spot(spot)


@router.post("/spots/{spot_id}/override")
def override(
    spot_id: uuid.UUID,
    body: OverrideRequest,
    db: Session = Depends(get_db),
    x_admin_actor: str | None = Header(default=None),
) -> dict:
    try:
        admin_spots.override_auto_field(
            spot_id, body.field, body.value, db=db, actor=_actor(x_admin_actor)
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Spot not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return admin_spots.spot_effective_view(spot_id, db=db)


@router.post("/spots/{spot_id}/revert")
def revert(
    spot_id: uuid.UUID,
    body: RevertRequest,
    db: Session = Depends(get_db),
    x_admin_actor: str | None = Header(default=None),
) -> dict:
    try:
        admin_spots.revert_override(
            spot_id, body.field, db=db, actor=_actor(x_admin_actor)
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Spot not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return admin_spots.spot_effective_view(spot_id, db=db)


@router.post("/spots/{spot_id}/image", response_model=SpotRead)
def set_image(
    spot_id: uuid.UUID,
    body: ImageRequest,
    db: Session = Depends(get_db),
    x_admin_actor: str | None = Header(default=None),
):
    try:
        spot = admin_spots.manage_spot_image(
            spot_id, body.to_image(), db=db, actor=_actor(x_admin_actor)
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Spot not found")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return SpotRead.from_orm_spot(spot)


@router.get("/spots/{spot_id}")
def effective_view(spot_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    try:
        return admin_spots.spot_effective_view(spot_id, db=db)
    except LookupError:
        raise HTTPException(status_code=404, detail="Spot not found")


@router.get("/spots/{spot_id}/readiness")
def readiness(spot_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    try:
        return validate_spot_readiness(spot_id, db=db)
    except LookupError:
        raise HTTPException(status_code=404, detail="Spot not found")


@router.post("/spots/{spot_id}/live")
def go_live(
    spot_id: uuid.UUID,
    db: Session = Depends(get_db),
    x_admin_actor: str | None = Header(default=None),
) -> dict:
    try:
        return admin_spots.set_spot_live(spot_id, db=db, actor=_actor(x_admin_actor))
    except LookupError:
        raise HTTPException(status_code=404, detail="Spot not found")
    except NotReadyError as exc:
        raise HTTPException(
            status_code=409,
            detail={"message": "spot not ready", "gaps": exc.gaps, "checklist": exc.checklist},
        )


@router.post("/spots/{spot_id}/era5")
def trigger_era5(
    spot_id: uuid.UUID,
    db: Session = Depends(get_db),
    client=Depends(get_cds_client),
) -> dict:
    try:
        trigger_era5_job(spot_id, db=db, client=client)
    except LookupError:
        raise HTTPException(status_code=404, detail="Spot not found")
    return get_job_status(spot_id, db=db)


@router.get("/spots/{spot_id}/era5")
def era5_status(spot_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    status = get_job_status(spot_id, db=db)
    if status is None:
        raise HTTPException(status_code=404, detail="No ERA5 job for spot")
    return status


@router.post("/spots/{spot_id}/assign-region", response_model=SpotRead)
def assign_region(
    spot_id: uuid.UUID, body: AssignRegionRequest, db: Session = Depends(get_db)
):
    try:
        spot = admin_regions.assign_spot_to_region(spot_id, body.region_id, db=db)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return SpotRead.from_orm_spot(spot)


# --- regions ---------------------------------------------------------------

@router.post("/regions", response_model=RegionRead, status_code=201)
def create_region(body: RegionCreate, db: Session = Depends(get_db)):
    region = admin_regions.create_region(body.to_data(), db=db)
    return RegionRead.from_orm_region(region)


@router.patch("/regions/{region_id}/defaults", response_model=RegionRead)
def update_defaults(
    region_id: uuid.UUID, body: RegionDefaultsUpdate, db: Session = Depends(get_db)
):
    try:
        region = admin_regions.update_region_defaults(region_id, body.defaults, db=db)
    except LookupError:
        raise HTTPException(status_code=404, detail="Region not found")
    return RegionRead.from_orm_region(region)


@router.post("/regions/{region_id}/stock-image", response_model=RegionRead)
def region_stock_image(
    region_id: uuid.UUID,
    db: Session = Depends(get_db),
    client=Depends(get_stock_client),
):
    try:
        region = admin_regions.set_region_stock_image(region_id, db=db, client=client)
    except LookupError:
        raise HTTPException(status_code=404, detail="Region not found")
    return RegionRead.from_orm_region(region)
