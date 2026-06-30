from fastapi import FastAPI

from app.api import admin, regions, search, spots
from app.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.api_title, debug=settings.api_debug)

app.include_router(spots.router)
app.include_router(regions.router)
app.include_router(search.router)
app.include_router(admin.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
