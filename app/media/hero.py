"""Hero-image requirements, validation and on-disk storage.

The rules here are the **server-side mirror** of the frontend gate in
``frontend/src/components/ImageUpload.tsx`` (``HERO_REQ``). Keep the two in sync:
min 3840×2000 px, landscape, JPG/PNG, ≤ 12 MB. The backend re-validates because a
client gate can always be bypassed.
"""

from __future__ import annotations

import io
import os

# --- requirements (mirror of frontend HERO_REQ) ----------------------------
HERO_MIN_WIDTH = 3840
HERO_MIN_HEIGHT = 2000
HERO_MAX_BYTES = 12 * 1024 * 1024  # 12 MB

# Accepted content types -> canonical file extension.
_CONTENT_TYPE_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
}


class HeroImageError(ValueError):
    """A hero image failed validation (→ 422 at the API, in German)."""


def validate_hero_image(data: bytes, content_type: str | None) -> tuple[int, int, str]:
    """Validate raw bytes against the hero rules.

    Returns ``(width, height, ext)`` on success; raises :class:`HeroImageError`
    with a German message otherwise. The actual pixel format is verified with
    Pillow, not trusted from the declared content type.
    """
    from PIL import Image, UnidentifiedImageError

    if len(data) > HERO_MAX_BYTES:
        mb = HERO_MAX_BYTES // (1024 * 1024)
        raise HeroImageError(f"Datei zu groß (max. {mb} MB).")

    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()  # cheap integrity check
        with Image.open(io.BytesIO(data)) as img:
            fmt = (img.format or "").upper()
            width, height = img.size
    except (UnidentifiedImageError, OSError):
        raise HeroImageError("Bild konnte nicht gelesen werden.")

    ext = {"JPEG": "jpg", "PNG": "png"}.get(fmt)
    if ext is None:
        raise HeroImageError("Format muss JPG oder PNG sein.")

    if width < HERO_MIN_WIDTH:
        raise HeroImageError(
            f"Zu klein: {width}×{height} px — mindestens {HERO_MIN_WIDTH} px Breite nötig."
        )
    if height < HERO_MIN_HEIGHT:
        raise HeroImageError(
            f"Zu niedrig: {width}×{height} px — mindestens {HERO_MIN_HEIGHT} px Höhe nötig."
        )
    if height >= width:
        raise HeroImageError(f"Querformat erforderlich (aktuell {width}×{height} px).")

    return width, height, ext


def save_hero_image(spot_id, data: bytes, ext: str, *, media_dir: str, url_prefix: str) -> str:
    """Write the hero image to ``{media_dir}/spots/{spot_id}/hero.{ext}``.

    Removes any previously-stored hero (a spot has exactly one) so a re-upload
    with a different extension can't leave a stale file behind. Returns the
    root-relative public URL.
    """
    spot_dir = os.path.join(media_dir, "spots", str(spot_id))
    os.makedirs(spot_dir, exist_ok=True)
    for existing_ext in _CONTENT_TYPE_EXT.values():
        stale = os.path.join(spot_dir, f"hero.{existing_ext}")
        if existing_ext != ext and os.path.exists(stale):
            os.remove(stale)

    path = os.path.join(spot_dir, f"hero.{ext}")
    with open(path, "wb") as fh:
        fh.write(data)

    return f"{url_prefix.rstrip('/')}/spots/{spot_id}/hero.{ext}"
