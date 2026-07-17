"""Public account endpoints: sign-up, session, profile, favourites, proposals.

Served by every deployment (mounted unconditionally in app.main) because the
account area lives on the public site. Auth is a session JWT in the app-scoped
httpOnly cookie (see app.account.security) — separate from the admin session.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.account import service
from app.account.deps import current_account
from app.account.security import create_app_session_token
from app.account.service import AuthError, EmailExistsError
from app.config import get_settings
from app.db.session import get_db
from app.models import AppUser

router = APIRouter(prefix="/account", tags=["account"])


# --- schemas ---------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str = Field(default="", alias="displayName")

    model_config = {"populate_by_name": True}


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfilePatch(BaseModel):
    display_name: str | None = Field(default=None, alias="displayName")
    email: str | None = None

    model_config = {"populate_by_name": True}


class PasswordChange(BaseModel):
    old_password: str = Field(alias="oldPassword")
    new_password: str = Field(alias="newPassword")

    model_config = {"populate_by_name": True}


class SubmissionRequest(BaseModel):
    name: str


class AccountOut(BaseModel):
    id: str
    email: str
    displayName: str
    createdAt: str

    @classmethod
    def of(cls, u: AppUser) -> "AccountOut":
        return cls(
            id=str(u.id),
            email=u.email,
            displayName=u.display_name,
            createdAt=u.created_at.isoformat(),
        )


# --- helpers ---------------------------------------------------------------

def _set_session_cookie(response: Response, user: AppUser) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.app_auth_cookie_name,
        value=create_app_session_token(user.id),
        max_age=settings.app_jwt_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        settings.app_auth_cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )


# --- auth ------------------------------------------------------------------

@router.post("/register", response_model=AccountOut, status_code=201)
def register(
    body: RegisterRequest, response: Response, db: Session = Depends(get_db)
) -> AccountOut:
    try:
        user = service.register(
            db,
            email=body.email,
            password=body.password,
            display_name=body.display_name,
        )
    except EmailExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    _set_session_cookie(response, user)
    return AccountOut.of(user)


@router.post("/login", response_model=AccountOut)
def login(
    body: LoginRequest, response: Response, db: Session = Depends(get_db)
) -> AccountOut:
    try:
        user = service.authenticate(db, body.email, body.password)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    _set_session_cookie(response, user)
    return AccountOut.of(user)


@router.post("/logout", status_code=204)
def logout() -> Response:
    response = Response(status_code=204)
    _clear_session_cookie(response)
    return response


@router.get("/me", response_model=AccountOut)
def me(user: AppUser = Depends(current_account)) -> AccountOut:
    return AccountOut.of(user)


@router.patch("/profile", response_model=AccountOut)
def update_profile(
    body: ProfilePatch,
    user: AppUser = Depends(current_account),
    db: Session = Depends(get_db),
) -> AccountOut:
    try:
        service.update_profile(
            db, user, display_name=body.display_name, email=body.email
        )
    except EmailExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return AccountOut.of(user)


@router.post("/password", status_code=204)
def change_password(
    body: PasswordChange,
    user: AppUser = Depends(current_account),
    db: Session = Depends(get_db),
) -> Response:
    try:
        service.change_password(db, user, body.old_password, body.new_password)
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    return Response(status_code=204)


# --- favourites ------------------------------------------------------------

@router.get("/favorites")
def list_favorites(
    user: AppUser = Depends(current_account), db: Session = Depends(get_db)
) -> dict:
    return {"items": service.list_favorites(db, user)}


@router.put("/favorites/{spot_id}", status_code=204)
def add_favorite(
    spot_id: uuid.UUID,
    user: AppUser = Depends(current_account),
    db: Session = Depends(get_db),
) -> Response:
    try:
        service.add_favorite(db, user, spot_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    db.commit()
    return Response(status_code=204)


@router.delete("/favorites/{spot_id}", status_code=204)
def remove_favorite(
    spot_id: uuid.UUID,
    user: AppUser = Depends(current_account),
    db: Session = Depends(get_db),
) -> Response:
    service.remove_favorite(db, user, spot_id)
    db.commit()
    return Response(status_code=204)


# --- spot proposals --------------------------------------------------------

@router.get("/submissions")
def list_submissions(
    user: AppUser = Depends(current_account), db: Session = Depends(get_db)
) -> dict:
    return {"items": service.list_my_submissions(db, user)}


@router.post("/submissions", status_code=201)
def create_submission(
    body: SubmissionRequest,
    user: AppUser = Depends(current_account),
    db: Session = Depends(get_db),
) -> dict:
    result = service.create_named_submission(db, user, body.name)
    db.commit()
    return result
