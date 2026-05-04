# syntax=docker/dockerfile:1
# Build context: repo root — docker build -f client/Dockerfile -t djgill/votr-client .

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Build the Vite SPA ────────────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY client/package.json ./client/
# --filter client... pulls in @votr/shared (workspace dep) automatically
RUN --mount=type=cache,id=pnpm-client,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "client..."
COPY packages/shared ./packages/shared
COPY client ./client

# Injected at build time so Vite can embed the API base URL into the bundle
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --filter client build

# ── Serve static assets with nginx ───────────────────────────────────────────
# nginx-unprivileged runs as uid 101 (nginx) instead of root; port 8080 by default
FROM nginxinc/nginx-unprivileged:alpine AS runner
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
RUN chmod -R a-w /usr/share/nginx/html /etc/nginx/conf.d/default.conf
EXPOSE 8080
