"""Vercel Python serverless entry — exposes the FastAPI app as an ASGI callable.

Vercel serves a module-level ASGI ``app``. The FastAPI app lives one level up, so
the project root goes on sys.path before importing it.

The browser calls ``/api/...`` (VITE_API_URL=/api), but the FastAPI routes live at
the root (``/spots``, ``/auth/login``, ``/admin/*``). This thin wrapper strips a
leading ``/api`` from the ASGI scope so FastAPI matches its normal routes — no
per-route change and no root_path juggling.

NOTE: the exact way Vercel passes the path to a rewritten function can only be
confirmed on a real deploy. If API calls 404 after deploying, check whether the
function already receives the path WITHOUT ``/api`` (then drop the strip) — see
DEPLOY-VERCEL.md.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app as _fastapi_app  # noqa: E402

_PREFIX = "/api"


async def app(scope, receive, send):
    if scope.get("type") in ("http", "websocket"):
        path = scope.get("path", "")
        if path == _PREFIX:
            new = "/"
        elif path.startswith(_PREFIX + "/"):
            new = path[len(_PREFIX):]
        else:
            new = None
        if new is not None:
            scope = dict(scope)
            scope["path"] = new
            scope["raw_path"] = new.encode("utf-8")
    await _fastapi_app(scope, receive, send)
