"""ORM models. Importing this package registers all tables on Base.metadata."""

from app.db.base import Base
from app.models.region import Region
from app.models.spot import Spot
from app.models.era5_job import Era5Job
from app.models.watch import Watch
from app.models.notification import Notification
from app.models.scoring_params import ScoringParams
from app.models.spot_audit import SpotAudit
from app.models.required_fields import RequiredField

__all__ = [
    "Base",
    "Region",
    "Spot",
    "Era5Job",
    "Watch",
    "Notification",
    "ScoringParams",
    "SpotAudit",
    "RequiredField",
]
