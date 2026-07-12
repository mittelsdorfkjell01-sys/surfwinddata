# Deploy everything on Vercel (serverless)

The whole app on one Vercel project + domain (`kjellmittelsdorf.de`):

```
kjellmittelsdorf.de (Vercel)
 ├── /            → static Vite SPA (incl. /admin dashboard)
 └── /api/*       → Python serverless function (FastAPI)
                     ├── Postgres+PostGIS → Neon  (external)
                     ├── Redis cache      → Upstash (external)
                     └── image uploads    → Vercel Blob
```

Because the SPA and `/api` share one origin, the login cookie stays same-site
(`SameSite=Lax` + `Secure`) and there is **no CORS**.

> **Honesty note.** Vercel can't run your Postgres/Redis/background jobs — those
> move to managed services, and the climatology batch runs **offline** (below).
> The repo is already prepared for this (see the changes referenced per step),
> but the Vercel-specific bits (function bundling, the 250 MB size limit on Linux,
> the `/api` path handling) can only be fully confirmed on a real deploy. If
> something 404s or the build is too big, see **Troubleshooting**.

---

## What's already done in the repo
- `api/index.py` — serverless ASGI entry (strips the `/api` prefix so FastAPI keeps its root routes).
- `vercel.json` — builds the SPA with `VITE_API_URL=/api`, routes `/api/*` to the function, SPA fallback for the rest.
- `api/requirements.txt` — **slim** function deps (no `pyarrow`/`uvicorn`/`alembic`/`pytest`) to stay under Vercel's 250 MB limit. `rawfile.py` now imports `pyarrow` lazily, so the request path never loads it (verified).
- `media_backend=blob` support (`app/media/storage.py`) — uploads to Vercel Blob and stores absolute URLs; the local disk path is unchanged for dev/VPS.
- `db_serverless=true` → SQLAlchemy `NullPool` (pair with Neon's pooled endpoint).
- App start no longer creates a media dir / mounts StaticFiles in blob mode (won't crash on the read-only serverless FS).

---

## Step 1 — Neon (Postgres + PostGIS)
1. Create a project at <https://neon.tech>. Note **two** connection strings:
   - **Direct** (for migrations): `...neon.tech/neondb?sslmode=require`
   - **Pooled** (for the app): host ends in `-pooler`, `...-pooler.neon.tech/...`
2. Convert them to the SQLAlchemy/psycopg form by prefixing the scheme:
   `postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require`
3. PostGIS is enabled by the first migration (`CREATE EXTENSION postgis`). If Neon
   requires enabling it first, run once in the Neon SQL editor: `CREATE EXTENSION IF NOT EXISTS postgis;`

## Step 2 — Upstash Redis
1. Create a database at <https://upstash.com> → copy the **`rediss://…`** URL.
   (Redis is a non-critical cache; `/health` reports `degraded`, not down, if it's off.)

## Step 3 — Vercel Blob
1. In the Vercel project → **Storage → Create → Blob**, connect it to the project.
2. Vercel auto-adds the **`BLOB_READ_WRITE_TOKEN`** env var — you don't set it by hand.

## Step 4 — migrate + seed + climatology (OFFLINE, from your machine)
Run these locally against Neon **before/at first deploy** — they don't run on Vercel:
```bash
# use the DIRECT (non-pooled) Neon URL here
export DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST/neondb?sslmode=require"

python -m alembic upgrade head          # schema + PostGIS
python -m app.seed.seed                 # regions + spots (if you seed)
python -m app.era5.batch --status all   # climatology (long-running; Vercel can't do this)
python -m scripts.verify_content        # red/green check
```
Re-run `app.era5.batch` from your machine whenever you add spots (it's idempotent).

## Step 5 — Vercel project
1. <https://vercel.com> → **Add New → Project** → import the `surfwinddata` repo.
   Keep **Root Directory = repo root** (the included `vercel.json` drives the build).
2. **Environment Variables** (Production):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** URL (`postgresql+psycopg://…-pooler…?sslmode=require`) |
   | `DB_SERVERLESS` | `true` |
   | `REDIS_URL` | Upstash `rediss://…` |
   | `MEDIA_BACKEND` | `blob` |
   | `BLOB_READ_WRITE_TOKEN` | (auto-added by the Blob store — leave it) |
   | `JWT_SECRET` | `openssl rand -base64 48` |
   | `ADMIN_BOOTSTRAP_EMAIL` | your admin email |
   | `ADMIN_BOOTSTRAP_PASSWORD` | a strong password (change after first login) |
   | `COOKIE_SECURE` | `true` |
   | `ERA5_AUTOPROCESS` | `false` (no background threads on serverless) |
   | `API_DEBUG` | `false` |
   | `TAKEDOWN_CONTACT_EMAIL` | e.g. `abuse@kjellmittelsdorf.de` |

3. **Deploy.**

## Step 6 — domain
Project → **Settings → Domains** → add `kjellmittelsdorf.de` → set the DNS records
Vercel shows you.

After deploy: `https://kjellmittelsdorf.de` = site, `…/admin` = dashboard (login
with the bootstrap admin).

---

## Troubleshooting
- **API calls 404 after deploy** → the function may already receive the path
  *without* `/api`. In `api/index.py` remove the `/api` strip (or adjust `_PREFIX`).
- **Build too big / 250 MB** → check the function bundle size in the build log.
  The heaviest remaining deps are `numpy`, `psycopg[binary]`, `pillow`, `shapely`.
  If over the limit, drop `pillow-avif-plugin` (falls back to WebP) or trim further.
- **`prepared statement "…" already exists`** (Neon pooled + psycopg) → transaction
  pooling doesn't like prepared statements. Add to `app/db/session.py`
  `connect_args={"prepare_threshold": None}` on the engine (only in serverless mode).
- **Image upload fails / bad URL** → the Blob branch in `app/media/storage.py`
  is best-effort and unverified against a live token; confirm the PUT response and
  the returned `url`, and adjust `_blob_put` to Vercel Blob's current REST shape.
- **Cold starts** slow on first hit — expected for a serverless FastAPI; fine for
  an admin tool + cached live data (Upstash).

## What still runs off-Vercel
- The **ERA5 climatology batch** (`python -m app.era5.batch`) — long-running, needs
  `pyarrow`; run it from your machine/CI against Neon. Live/forecast (short,
  Upstash-cached) runs fine in the function.
