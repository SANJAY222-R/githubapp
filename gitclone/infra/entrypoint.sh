#!/bin/sh
set -e

echo "=== GitClone Container Startup ==="
echo "Node Environment: ${NODE_ENV:-production}"
echo "Port: ${PORT:-8787}"

if [ -n "$DATABASE_URL" ]; then
  echo "Database URL configured. Synchronizing database tables if needed..."
  # If drizzle migrations or push scripts exist, execute them
  if [ -f "./apps/api/node_modules/.bin/drizzle-kit" ] || [ -f "./node_modules/.bin/drizzle-kit" ]; then
    echo "Running schema sync..."
    npx drizzle-kit push --config=apps/api/drizzle.config.ts 2>/dev/null || true
  fi
else
  echo "WARNING: DATABASE_URL is not set. Please supply a Neon PostgreSQL connection string at runtime."
fi

if [ -n "$GITHUB_PAT" ] || [ -n "$SYSTEM_GITHUB_PAT" ]; then
  echo "Shared GitHub PAT detected. Bootstrapping shared multi-user runtime context..."
else
  echo "INFO: No GITHUB_PAT supplied at runtime. Users can authenticate using PAT in the web interface."
fi

echo "Starting GitClone server on port ${PORT:-8787}..."
exec node apps/api/dist/index.js
