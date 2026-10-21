#!/bin/bash
# ==============================================================================
# VPS Multivus — CLI Healthcheck
# ==============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Executando healthcheck local..."

# 1. Test Backend API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3050/api/health || true)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓ Backend API: ONLINE (HTTP 200)${NC}"
else
  echo -e "${RED}✗ Backend API: FALHA (HTTP ${HTTP_CODE})${NC}"
  exit 1
fi

# 2. Test Docker Container Status
if docker ps | grep -q "vps-multivus-backend"; then
  echo -e "${GREEN}✓ Container Backend: RUNNING${NC}"
else
  echo -e "${RED}✗ Container Backend: STOPPED${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Todos os componentes estão saudáveis.${NC}"
