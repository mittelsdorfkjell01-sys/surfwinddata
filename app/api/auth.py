"""Authentication endpoints: login / logout / me (Sprint A)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import service
from app.auth.deps import Principal, current_user
from app.auth.security import create_session_token
from app.config import get_settings
from app.db.session import get_db
from app.models import AdminUser

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str

    @classmethod
    def from_user(cls, user: AdminUser) -> "UserOut":
        return cls(
            id=str(user.id),
            email=user.email,
            display_name=user.display_name,
            role=user.role,
        )


def set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.jwt_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


@router.post("/login", response_model=UserOut)
def login(
    body: LoginRequest, response: Response, db: Session = Depends(get_db)
) -> UserOut:
    user = service.authenticate(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort ist falsch.")
    service.touch_last_login(db, user)
    db.commit()
    set_session_cookie(response, create_session_token(user.id, user.role))
    return UserOut.from_user(user)


@router.post("/logout", status_code=204)
def logout():
    response = Response(status_code=204)
    response.delete_cookie(get_settings().auth_cookie_name, path="/")
    return response


@router.get("/me", response_model=UserOut)
def me(
    principal: Principal = Depends(current_user), db: Session = Depends(get_db)
) -> UserOut:
    if principal.user_id is None:  # break-glass: no backing DB row
        return UserOut(
            id="break-glass",
            email=principal.email,
            display_name="Break-Glass",
            role=principal.role,
        )
    user = db.get(AdminUser, principal.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Konto nicht gefunden.")
    return UserOut.from_user(user)
