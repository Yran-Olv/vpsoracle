#!/bin/bash
# ==============================================================================
# VPS Multivus — Script de Restauração
# ==============================================================================

set -e

if [ -z "$1" ]; then
  echo "Uso: $0 /caminho/para/vps_multivus_backup_YYYYMMDD_HHMMSS.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Erro: Arquivo de backup não encontrado: ${BACKUP_FILE}"
  exit 1
fi

echo "Parando containers..."
docker compose down || true

echo "Restaurando backup ${BACKUP_FILE}..."
tar -xzf "${BACKUP_FILE}" -C /opt/vps-multivus/

echo "Iniciando containers..."
docker compose up -d

echo "Restauração concluída."
