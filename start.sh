#!/bin/bash
# Starts the Coco Pith Factory system: the NestJS API (apps/api) and the
# Vite frontend (apps/web) together, in dev mode.
#
# Prerequisites (see docs/setup.md):
#   - Node.js 22+, npm
#   - A local PostgreSQL instance, with apps/api/.env's DATABASE_URL
#     pointing at it (copy apps/api/.env.example if you don't have one)
#   - apps/web/.env.local with VITE_API_BASE_URL pointing at the API port
#   - `npm install` already run in both apps/api and apps/web
#
# This does NOT touch the legacy Go core (server/, plugins/) — that
# system is started separately, see repo-root README.md.
#
# Cleanup note: `kill 0` (killing this script's own process group) was
# tried first and does NOT reliably stop the real node processes here —
# verified by testing, not assumed. Each dev server is
# bash subshell -> npm -> nest/vite -> node, several layers deep, and
# SIGINT doesn't propagate through all of them reliably in a
# non-interactive shell. Killing by the port each server actually binds
# is robust regardless of how many process layers are in between.

set -e

API_PORT="$(grep -E '^PORT=' apps/api/.env 2>/dev/null | cut -d= -f2)"
API_PORT="${API_PORT:-3000}"
WEB_PORT=5173

cleanup() {
  echo ""
  echo "Stopping (port $API_PORT and $WEB_PORT)..."
  for port in "$API_PORT" "$WEB_PORT"; do
    pid="$(lsof -ti ":$port" 2>/dev/null)"
    if [ -n "$pid" ]; then
      kill -9 $pid 2>/dev/null
    fi
  done
}
trap cleanup EXIT INT TERM

echo "Starting API on port $API_PORT and web on port $WEB_PORT..."
(cd apps/api && npm run start:dev) &
(cd apps/web && npm run dev) &

wait
