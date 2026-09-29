#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="$ROOT/dist/intranet-package"
ARCHIVE="$ROOT/dist/mcl-intranet-local-server.tar.gz"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "[1/4] Construindo imagem do MCL..."
docker compose -f docker-compose.intranet.yml build app

echo "[2/4] Baixando PostgreSQL 16..."
docker pull postgres:16-alpine

echo "[3/4] Exportando imagens Docker..."
docker save mcl-intranet:local postgres:16-alpine | gzip > "$OUT/mcl-intranet-images.tar.gz"

cp docker-compose.intranet.yml "$OUT/"
cp .env.intranet.example "$OUT/"

cat > "$OUT/INSTALAR.txt" <<'EOF'
MCL - INSTALACAO EM SERVIDOR LOCAL

1. Instale Docker Engine + Docker Compose no servidor.
2. Copie esta pasta para o servidor.
3. Execute:
   gunzip -c mcl-intranet-images.tar.gz | docker load
4. Copie .env.intranet.example para .env.intranet.
5. Edite .env.intranet e substitua IP_DO_SERVIDOR e todos os CHANGE_ME.
6. Inicie:
   docker compose --env-file .env.intranet -f docker-compose.intranet.yml up -d --no-build
7. Valide:
   http://IP_DO_SERVIDOR:3000/api/health/db
8. Abra:
   http://IP_DO_SERVIDOR:3000

Para preservar dados do ambiente atual, restaure o dump PostgreSQL antes do uso operacional.
Consulte docs/INTRANET_SERVER.md no repositorio para o procedimento completo.
EOF

echo "[4/4] Gerando pacote..."
tar -czf "$ARCHIVE" -C "$OUT" .

echo "Pacote criado em: $ARCHIVE"
