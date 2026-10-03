# syntax=docker/dockerfile:1.4
FROM node:22-alpine@sha256:0b0a886dfaa791b8d6978eb865187e5b61aaad6e17415494f6c4be09f7a55cff AS base
WORKDIR /app
RUN npm install -g pnpm@9.15.0

# 1. Dependencies Stage
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# 2. Build Stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .

# Build all packages in correct dependency order
RUN pnpm --filter @gitclone/shared build
RUN pnpm --filter @gitclone/web build
RUN pnpm --filter @gitclone/api build

# 3. Hardened Production Runner Stage
FROM node:22-alpine@sha256:0b0a886dfaa791b8d6978eb865187e5b61aaad6e17415494f6c4be09f7a55cff AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

# Security hardening: Run as non-root user
USER node

# Copy compiled backend, static frontend assets, and production dependencies
COPY --chown=node:node --from=build /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=build /app/apps/web/dist ./apps/web/dist
COPY --chown=node:node --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --chown=node:node --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/package.json ./package.json
COPY --chown=node:node --from=build /app/infra/entrypoint.sh ./entrypoint.sh

# Expose unified application port
EXPOSE 8787

# Healthcheck probing Hono API health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8787/api/health || exit 1

CMD ["sh", "./entrypoint.sh"]
