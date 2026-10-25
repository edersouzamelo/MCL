#!/usr/bin/env bash
set -euo pipefail

MCL_DIR="${MCL_DIR:-/opt/mcl}"
MCL_REPO="${MCL_REPO:-https://github.com/edersouzamelo/MCL.git}"
MCL_REF="${MCL_REF:-feat/intranet-local-server-20260929}"
MCL_IP="${MCL_IP:-10.56.120.28}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Execute como root: sudo bash scripts/install-intranet-ubuntu-26.04.sh"
  exit 1
fi

if ! grep -q 'Ubuntu 26.04' /etc/os-release 2>/dev/null; then
  echo "Aviso: este instalador foi preparado para Ubuntu 26.04."
fi

echo "[1/7] Atualizando indice de pacotes..."
apt-get update

echo "[2/7] Instalando Docker, Compose, Git e utilitarios..."
apt-get install -y docker.io git ca-certificates curl
if apt-cache show docker-compose-v2 >/dev/null 2>&1; then
  apt-get install -y docker-compose-v2
elif apt-cache show docker-compose-plugin >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
else
  apt-get install -y docker-compose
fi

systemctl enable --now docker

echo "[3/7] Preparando codigo do MCL..."
if [ -d "$MCL_DIR/.git" ]; then
  git -C "$MCL_DIR" fetch --all --prune
else
  mkdir -p "$(dirname "$MCL_DIR")"
  git clone "$MCL_REPO" "$MCL_DIR"
fi

git -C "$MCL_DIR" checkout "$MCL_REF"
git -C "$MCL_DIR" pull --ff-only origin "$MCL_REF"

cd "$MCL_DIR"

echo "[4/7] Preparando configuracao..."
if [ ! -f .env.intranet ]; then
  cp .env.intranet.example .env.intranet
fi

sed -i "s|^MCL_BASE_URL=.*|MCL_BASE_URL=http://${MCL_IP}:3000|" .env.intranet

if grep -q 'CHANGE_ME_BEFORE_START' .env.intranet; then
  echo
  echo "ATENCAO: ainda faltam POSTGRES_PASSWORD e AUTH_SECRET em $MCL_DIR/.env.intranet."
  echo "Edite o arquivo antes de subir o servico."
  echo
  exit 2
fi

echo "[5/7] Construindo e iniciando MCL + PostgreSQL..."
docker compose --env-file .env.intranet -f docker-compose.intranet.yml up -d --build

echo "[6/7] Aguardando healthcheck..."
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:3000/api/health/db" >/dev/null 2>&1; then
    echo "MCL respondeu com banco conectado."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "MCL nao ficou saudavel dentro do prazo."
    docker compose --env-file .env.intranet -f docker-compose.intranet.yml ps
    exit 3
  fi
  sleep 5
done

echo "[7/7] Instalacao concluida."
echo "URL interna: http://${MCL_IP}:3000"
echo "Healthcheck: http://${MCL_IP}:3000/api/health/db"
