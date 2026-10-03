# syntax=docker/dockerfile:1.4
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@9.15.0

# 1. Build Stage
FROM base AS build
# Copy source code first (excluding node_modules via .dockerignore)
COPY . .

# Clean install all dependencies inside the container environment
RUN pnpm install --frozen-lockfile

# Compile all workspace packages in dependency order
RUN pnpm --filter @gitclone/shared build
RUN pnpm --filter @gitclone/web build
RUN pnpm --filter @gitclone/api build

# 2. Hardened Production Runner Stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV NODE_PATH=/app/node_modules:/app/apps/api/node_modules

# Security hardening: Run as non-root user
USER node

# Copy compiled backend, static frontend assets, and all workspace dependencies
COPY --chown=node:node --from=build /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --chown=node:node --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --chown=node:node --from=build /app/apps/web/dist ./apps/web/dist
COPY --chown=node:node --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --chown=node:node --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:node --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/package.json ./package.json
COPY --chown=node:node --from=build /app/infra/entrypoint.sh ./entrypoint.sh

# Expose unified application port
EXPOSE 8787

# Healthcheck probing Hono API health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8787/api/health || exit 1

CMD ["sh", "./entrypoint.sh"]
