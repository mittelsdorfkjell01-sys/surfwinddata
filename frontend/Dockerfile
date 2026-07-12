# Web image for the single-domain deploy: build the Vite SPA, then bake it into a
# Caddy image that serves it at / and reverse-proxies the API under /api. Caddy's
# actual config (TLS + the /api proxy) is the repo-root Caddyfile, which
# docker-compose.prod.yml bind-mounts. Frontend + backend share one origin, so the
# login session cookie stays first-party/same-site and there is no CORS.

# --- build the static SPA ---------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Same-origin API base: every request goes to /api/* on the same host (Caddy
# strips the /api prefix before the backend). Overridable at build time.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- serve via Caddy --------------------------------------------------------
FROM caddy:2-alpine
COPY --from=build /app/dist /srv/www
