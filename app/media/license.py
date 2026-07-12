"""Versioned image-upload license terms (Sprint C).

The uploader must actively accept these before an image is stored; the accepted
version + timestamp are persisted on the ``spot_images`` row for provenance. Bump
``IMAGE_LICENSE_VERSION`` whenever the wording changes so old acceptances stay
attributable to the exact text they agreed to.

Legal note: this is a building block, not legal advice. Have a lawyer review the
wording before production.
"""

from __future__ import annotations

IMAGE_LICENSE_VERSION = "v1"

IMAGE_LICENSE_TERMS = (
    "Bild-Upload — Rechte & Einwilligung (v1)\n\n"
    "Mit dem Hochladen bestätige ich, dass ich Urheber:in dieses Bildes bin oder "
    "alle erforderlichen Nutzungsrechte daran besitze. Ich räume surfwinddata ein "
    "einfaches, weltweites, unentgeltliches Recht ein, das Bild auf der Plattform "
    "(Web und mobil) zu speichern, anzuzeigen, in der Größe anzupassen und im "
    "Rahmen der Plattform zu bewerben. Ich bestätige, dass erkennbar abgebildete "
    "Personen der Veröffentlichung zugestimmt haben und dass keine Rechte Dritter "
    "(u. a. Marken, Kunstwerke, Persönlichkeits- und Urheberrechte) verletzt "
    "werden. Mir ist bewusst, dass ich die Entfernung des Bildes jederzeit "
    "verlangen kann und dass surfwinddata Inhalte bei Rechteverstößen entfernt."
)


def license_terms() -> dict:
    """Public payload for the upload form: version + full terms text."""
    return {"version": IMAGE_LICENSE_VERSION, "terms": IMAGE_LICENSE_TERMS}
