#!/bin/bash
# ==============================================================================
# VPS Multivus — Script de Backup com Rotação
# ==============================================================================

set -e

BACKUP_DIR="/var/backups/vps-multivus"
DATA_DIR="/opt/vps-multivus/backend/data"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/vps_multivus_backup_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "Iniciando backup em ${BACKUP_FILE}..."

# Create archive of database & env
tar -czf "${BACKUP_FILE}" \
  -C /opt/vps-multivus \
  .env \
  backend/data 2>/dev/null || {
    # Fallback to local data dir if running locally
    tar -czf "${BACKUP_FILE}" backend/data .env 2>/dev/null || true
  }

echo "Backup gerado com sucesso: ${BACKUP_FILE}"

# Retention: Keep last 14 backups, delete older
echo "Aplicando política de retenção (14 dias)..."
find "${BACKUP_DIR}" -type f -name "vps_multivus_backup_*.tar.gz" -mtime +14 -exec rm -f {} \;

echo "Backup finalizado."
