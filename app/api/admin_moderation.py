"""Admin moderation/review endpoints (Sprint D). Role: admin or curator.

Separate router (same guard as the rest of ``/admin``) that turns the review
queue into decisions. Approvals flow through the normal admin write path.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.admin import moderation
from app.admin.deps import get_extract_client
from app.auth.deps import get_actor, require_role
from app.db.session import get_db

router = APIRouter(
    prefix="/admin",
    tags=["moderation"],
    dependencies=[Depends(require_role("admin", "curator"))],
)


class NoteBody(BaseModel):
    note: str | None = None


@router.get("/review/queue")
def review_queue(db: Session = Depends(get_db)) -> dict:
    return moderation.review_queue(db)


# --- submissions -----------------------------------------------------------

@router.post("/submissions/{submission_id}/approve", status_code=201)
def approve_submission(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: str = Depends(get_actor),
    client=Depends(get_extract_client),
) -> dict:
    try:
        spot = moderation.approve_submission(
            db, submission_id, actor=actor, client=client
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Einreichung nicht gefunden.")
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return {"spot_id": str(spot.id), "status": spot.status}


@router.post("/submissions/{submission_id}/reject")
def reject_submission(
    submission_id: uuid.UUID,
    body: NoteBody,
    db: Session = Depends(get_db),
    actor: str = Depends(get_actor),
) -> dict:
    try:
        moderation.reject_submission(db, submission_id, actor=actor, note=body.note)
    except LookupError:
        raise HTTPException(status_code=404, detail="Einreichung nicht gefunden.")
    return {"status": "rejected"}


# --- images ----------------------------------------------------------------

@router.post("/images/{image_id}/approve")
def approve_image(
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: str = Depends(get_actor),
) -> dict:
    try:
        img = moderation.approve_hero_image(db, image_id, actor=actor)
    except LookupError:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden.")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {"id": str(img.id), "status": img.status}


@router.post("/images/{image_id}/reject")
def reject_image(
    image_id: uuid.UUID,
    body: NoteBody,
    db: Session = Depends(get_db),
    actor: str = Depends(get_actor),
) -> dict:
    try:
        img = moderation.reject_image(db, image_id, actor=actor, note=body.note)
    except LookupError:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden.")
    return {"id": str(img.id), "status": img.status}


@router.post("/images/{image_id}/remove")
def remove_image(
    image_id: uuid.UUID,
    body: NoteBody,
    db: Session = Depends(get_db),
    actor: str = Depends(get_actor),
) -> dict:
    try:
        img = moderation.remove_image(db, image_id, actor=actor, note=body.note)
    except LookupError:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden.")
    return {"id": str(img.id), "status": img.status}


@router.post("/images/{image_id}/dismiss-reports")
def dismiss_reports(
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: str = Depends(get_actor),
) -> dict:
    try:
        img = moderation.dismiss_reports(db, image_id, actor=actor)
    except LookupError:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden.")
    return {"id": str(img.id), "report_count": img.report_count}


# --- tips & ratings --------------------------------------------------------

@router.post("/tips/{tip_id}/hide")
def hide_tip(
    tip_id: uuid.UUID, db: Session = Depends(get_db), actor: str = Depends(get_actor)
) -> dict:
    try:
        tip = moderation.set_tip_status(db, tip_id, "hidden", actor=actor)
    except LookupError:
        raise HTTPException(status_code=404, detail="Tipp nicht gefunden.")
    return {"id": str(tip.id), "status": tip.status}


@router.post("/tips/{tip_id}/restore")
def restore_tip(
    tip_id: uuid.UUID, db: Session = Depends(get_db), actor: str = Depends(get_actor)
) -> dict:
    try:
        tip = moderation.set_tip_status(db, tip_id, "published", actor=actor)
    except LookupError:
        raise HTTPException(status_code=404, detail="Tipp nicht gefunden.")
    return {"id": str(tip.id), "status": tip.status}


@router.post("/ratings/{rating_id}/hide")
def hide_rating(
    rating_id: uuid.UUID, db: Session = Depends(get_db), actor: str = Depends(get_actor)
) -> dict:
    try:
        rating = moderation.set_rating_status(db, rating_id, "hidden", actor=actor)
    except LookupError:
        raise HTTPException(status_code=404, detail="Bewertung nicht gefunden.")
    return {"id": str(rating.id), "status": rating.status}


@router.post("/ratings/{rating_id}/restore")
def restore_rating(
    rating_id: uuid.UUID, db: Session = Depends(get_db), actor: str = Depends(get_actor)
) -> dict:
    try:
        rating = moderation.set_rating_status(db, rating_id, "published", actor=actor)
    except LookupError:
        raise HTTPException(status_code=404, detail="Bewertung nicht gefunden.")
    return {"id": str(rating.id), "status": rating.status}
