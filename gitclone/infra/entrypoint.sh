#!/bin/sh
set -e

echo "=== GitClone Container Startup ==="
echo "Node Environment: ${NODE_ENV:-production}"
echo "Port: ${PORT:-8787}"

export NODE_PATH=/app/node_modules:/app/apps/api/node_modules:/app/packages/shared/node_modules

if [ -n "$GITHUB_PAT" ] || [ -n "$SYSTEM_GITHUB_PAT" ]; then
  echo "Shared GitHub PAT detected. Bootstrapping shared multi-user runtime context..."
else
  echo "INFO: No GITHUB_PAT supplied at runtime. Users can authenticate using PAT in the web interface."
fi

echo "Starting GitClone server on port ${PORT:-8787}..."
cd /app/apps/api
exec node dist/index.js
