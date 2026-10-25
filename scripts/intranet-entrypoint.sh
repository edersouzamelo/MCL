#!/usr/bin/env sh
set -eu

echo "[MCL intranet] Iniciando servidor local."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[MCL intranet] ERRO: DATABASE_URL nao configurada." >&2
  exit 64
fi

if printf '%s' "$DATABASE_URL" | grep -q "CHANGE_ME"; then
  echo "[MCL intranet] ERRO: altere POSTGRES_PASSWORD antes de iniciar." >&2
  exit 64
fi

if [ -z "${AUTH_SECRET:-}" ] || [ "$AUTH_SECRET" = "CHANGE_ME_BEFORE_START" ]; then
  echo "[MCL intranet] ERRO: defina AUTH_SECRET antes de iniciar." >&2
  exit 64
fi

echo "[MCL intranet] Aplicando migrations PostgreSQL..."
pnpm exec prisma migrate deploy

if [ "${MCL_RUN_SEED:-false}" = "true" ]; then
  echo "[MCL intranet] Seed explicitamente habilitado."
  pnpm db:seed
fi

if [ "${MCL_REBUILD_ON_START:-true}" = "true" ] || [ ! -f .next/BUILD_ID ]; then
  echo "[MCL intranet] Compilando aplicacao Next.js..."
  pnpm exec next build
fi

echo "[MCL intranet] Servindo em 0.0.0.0:${PORT:-3000}"
exec pnpm exec next start -H 0.0.0.0 -p "${PORT:-3000}"
