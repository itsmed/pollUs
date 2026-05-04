# syntax=docker/dockerfile:1
# Build context: repo root — docker build -f server/Dockerfile -t djgill/votr-server .

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Install all deps (build-time tools included) ─────────────────────────────
FROM base AS build
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY server/package.json ./server/
RUN --mount=type=cache,id=pnpm-server-all,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter server
COPY server ./server
RUN pnpm --filter server build

# ── Install production deps only ──────────────────────────────────────────────
FROM base AS prod-deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY server/package.json ./server/
RUN --mount=type=cache,id=pnpm-server-prod,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter server --prod

# ── Minimal runtime image ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps --chown=node:node /app/server/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server/dist ./dist
RUN chmod -R a-w ./node_modules ./dist

USER node
EXPOSE 4000
CMD ["node", "dist/bin/www.js"]
