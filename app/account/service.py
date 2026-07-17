"""Account domain logic: visitor sign-up/profile, favourites, spot proposals.

Service functions flush but do not commit — the API endpoint owns the
transaction (mirrors :mod:`app.auth.service`). Validation errors raise
:class:`ValueError` (mapped to 400 at the API) or the specific errors below.
"""

from __future__ import annotations

import uuid

from sqlalchemy import delete, exists, select
from sqlalchemy.orm import Session

from app.account.security import hash_password, verify_password
from app.config import get_settings
from app.models import AppUser, Favorite, Spot, SpotSubmission
from app.models.app_user import normalize_email


class EmailExistsError(ValueError):
    """Duplicate email on registration / profile change (→ 409 at the API)."""


class AuthError(ValueError):
    """Bad credentials or wrong current password (→ 401/400 at the API)."""


# --- accounts --------------------------------------------------------------

def get_by_email(db: Session, email: str) -> AppUser | None:
    return db.execute(
        select(AppUser).where(AppUser.email == normalize_email(email))
    ).scalar_one_or_none()


def _validate_password(password: str) -> None:
    min_len = get_settings().app_password_min_length
    if len(password or "") < min_len:
        raise ValueError(f"Das Passwort muss mindestens {min_len} Zeichen haben.")


def _validate_email(email: str) -> str:
    email = normalize_email(email)
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise ValueError("Bitte eine gültige E-Mail eingeben.")
    return email


def register(
    db: Session, *, email: str, password: str, display_name: str | None
) -> AppUser:
    email = _validate_email(email)
    _validate_password(password)
    if get_by_email(db, email) is not None:
        raise EmailExistsError("Für diese E-Mail existiert bereits ein Konto.")
    user = AppUser(
        email=email,
        password_hash=hash_password(password),
        display_name=(display_name or "").strip() or email.split("@")[0],
    )
    db.add(user)
    db.flush()
    return user


def authenticate(db: Session, email: str, password: str) -> AppUser:
    user = get_by_email(db, email)
    if user is None or not user.is_active or not verify_password(
        password, user.password_hash
    ):
        raise AuthError("E-Mail oder Passwort ist falsch.")
    return user


def update_profile(
    db: Session,
    user: AppUser,
    *,
    display_name: str | None = None,
    email: str | None = None,
) -> AppUser:
    if email is not None:
        new_email = _validate_email(email)
        if new_email != user.email:
            other = get_by_email(db, new_email)
            if other is not None and other.id != user.id:
                raise EmailExistsError("Diese E-Mail ist bereits vergeben.")
            user.email = new_email
    if display_name is not None:
        cleaned = display_name.strip()
        if cleaned:
            user.display_name = cleaned
    db.flush()
    return user


def change_password(db: Session, user: AppUser, old_pw: str, new_pw: str) -> None:
    if not verify_password(old_pw, user.password_hash):
        raise AuthError("Das aktuelle Passwort ist falsch.")
    _validate_password(new_pw)
    user.password_hash = hash_password(new_pw)
    db.flush()


# --- favourites ------------------------------------------------------------

def list_favorites(db: Session, user: AppUser) -> list[dict]:
    """The user's favourites, newest first, resolved against the live spot.

    Each row is ``{id, name, region, sports, addedAt}`` (the shape the frontend
    account layer expects). A favourite whose spot was deleted is skipped — the
    cascade normally removes it, so this only guards a race.
    """
    rows = db.execute(
        select(Favorite, Spot)
        .join(Spot, Spot.id == Favorite.spot_id)
        .where(Favorite.app_user_id == user.id)
        .order_by(Favorite.created_at.desc())
    ).all()
    out: list[dict] = []
    for fav, spot in rows:
        region = spot.region
        region_label = (
            f"{region.name}, {region.country}"
            if region and region.country
            else (region.name if region else None)
        )
        out.append(
            {
                "id": str(spot.id),
                "name": spot.name,
                "region": region_label,
                "sports": list(spot.sports or []),
                "addedAt": fav.created_at.isoformat(),
            }
        )
    return out


def add_favorite(db: Session, user: AppUser, spot_id: uuid.UUID) -> bool:
    """Save a spot. Idempotent — returns True if newly added, False if it was
    already saved. Raises ValueError when the spot does not exist."""
    if not db.execute(select(exists().where(Spot.id == spot_id))).scalar():
        raise ValueError("Spot nicht gefunden.")
    already = db.execute(
        select(exists().where(
            Favorite.app_user_id == user.id, Favorite.spot_id == spot_id
        ))
    ).scalar()
    if already:
        return False
    db.add(Favorite(app_user_id=user.id, spot_id=spot_id))
    db.flush()
    return True


def remove_favorite(db: Session, user: AppUser, spot_id: uuid.UUID) -> None:
    db.execute(
        delete(Favorite).where(
            Favorite.app_user_id == user.id, Favorite.spot_id == spot_id
        )
    )
    db.flush()


# --- spot proposals --------------------------------------------------------

def list_my_submissions(db: Session, user: AppUser) -> list[dict]:
    """The user's spot proposals, newest first, as ``{id, name, status,
    createdAt}``. The display name comes from the stored payload."""
    subs = db.execute(
        select(SpotSubmission)
        .where(SpotSubmission.app_user_id == user.id)
        .order_by(SpotSubmission.created_at.desc())
    ).scalars().all()
    return [
        {
            "id": str(s.id),
            "name": (s.payload or {}).get("name") or "Unbenannter Spot",
            "status": s.status,
            "createdAt": s.created_at.isoformat(),
        }
        for s in subs
    ]


def create_named_submission(db: Session, user: AppUser, name: str) -> dict:
    """Record a lightweight 'propose a spot by name' from the account page.

    Unlike the full community submission (which validates a complete SpotCreate
    payload), this stores just a name for an admin to flesh out on review — the
    account UX only asks for a name. Owned by the account via ``app_user_id``.
    """
    clean = (name or "").strip() or "Unbenannter Spot"
    sub = SpotSubmission(
        payload={"name": clean},
        submitter_name=user.display_name,
        submitter_email=user.email,
        app_user_id=user.id,
        status="pending",
    )
    db.add(sub)
    db.flush()
    db.refresh(sub)  # load server_default created_at / status
    return {
        "id": str(sub.id),
        "name": clean,
        "status": sub.status,
        "createdAt": sub.created_at.isoformat(),
    }
