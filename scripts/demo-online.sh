#!/usr/bin/env bash
# Demo publicada (ADR 0029): compila la web de producción, levanta la API y la web en sus puertos de demo y abre el
# túnel. Requiere `pnpm db:start` y el túnel creado (README, «Demo en internet»). Ctrl+C lo apaga todo.
set -euo pipefail
host="${PLATLAB_DEMO_HOST:-platlab.reacti-lab.com}"
config="${PLATLAB_TUNNEL_CONFIG:-$HOME/.cloudflared/platlab.yml}"
cd "$(dirname "$0")/.."

command -v cloudflared >/dev/null || { echo 'Falta cloudflared (README, «Demo en internet»).' >&2; exit 1; }
[ -f "$config" ] || { echo "Falta la configuración del túnel en $config." >&2; exit 1; }
curl -fsS -o /dev/null http://127.0.0.1:54321/auth/v1/health -H 'apikey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' ||
  { echo 'Supabase local no responde: corre `pnpm db:start`.' >&2; exit 1; }

# Auth por el mismo origen (el túnel reparte /auth/v1) y sin «Crear cuenta».
VITE_SUPABASE_URL="https://$host" VITE_SIGNUP=off pnpm --filter @platlab/web build

PORT=3100 pnpm --filter @platlab/server start &
api=$!
# En IPv4 explícito: `localhost` puede ser solo ::1 y el túnel apunta a 127.0.0.1.
pnpm --filter @platlab/web exec vite preview --host 127.0.0.1 --port 4180 --strictPort &
web=$!
trap 'kill "$api" "$web" 2>/dev/null' EXIT

echo "Demo en https://$host"
cloudflared tunnel --config "$config" run
