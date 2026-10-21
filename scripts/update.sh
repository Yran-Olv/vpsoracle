#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}🔄 Atualizador do VPS Multivus${NC}"
echo -e "${BLUE}======================================================${NC}"

INSTALL_DIR="/opt/vps-multivus"
cd "${INSTALL_DIR}"

echo -e "${YELLOW}1. Criando backup de segurança pré-atualização...${NC}"
bash scripts/backup.sh

echo -e "${YELLOW}2. Reconstruindo containers...${NC}"
docker compose build --no-cache
docker compose up -d

echo -e "${YELLOW}3. Testando healthcheck...${NC}"
sleep 5
bash scripts/healthcheck.sh

echo -e "${GREEN}✅ VPS Multivus atualizado com sucesso!${NC}"
