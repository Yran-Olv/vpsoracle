#!/bin/bash
# ==============================================================================
# VPS Multivus — Script de Deploy Remoto na VPS Oracle
# IP: 147.15.19.44 | Domínio: vps.multivus.com.br
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_HOST="147.15.19.44"
VPS_USER="ubuntu"

if [ -f "/home/yran/Área de trabalho/vps oracle/ssh-key-2026-09-09.key" ]; then
  SSH_KEY="/home/yran/Área de trabalho/vps oracle/ssh-key-2026-09-09.key"
elif [ -f "/home/yran/Documentos/vps oracle/ssh-key-2026-09-09.key" ]; then
  SSH_KEY="/home/yran/Documentos/vps oracle/ssh-key-2026-09-09.key"
else
  SSH_KEY="${HOME}/Área de trabalho/vps oracle/ssh-key-2026-09-09.key"
fi

REMOTE_DIR="/home/ubuntu/vps-multivus"

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}🚀 Sincronizando e Implantando VPS Multivus na Oracle VPS...${NC}"
echo -e "Host: ${VPS_HOST} | User: ${VPS_USER}"
echo -e "${BLUE}======================================================${NC}"

# 1. Test SSH Connection
echo -e "${YELLOW}1. Testando conexão SSH com a VPS...${NC}"
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o ConnectTimeout=8 "${VPS_USER}@${VPS_HOST}" "echo 'Conexão SSH OK na máquina' \$(hostname)"

# 2. Sync Files via rsync
echo -e "${YELLOW}2. Sincronizando arquivos do projeto...${NC}"
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "mkdir -p ${REMOTE_DIR}"

rsync -avz -e "ssh -i \"${SSH_KEY}\" -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '*.log' \
  ./ "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

# 3. Execute Remote Build and Start
echo -e "${YELLOW}3. Executando build dos containers Docker na VPS...${NC}"
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" << 'EOF'
set -e
cd /home/ubuntu/vps-multivus

if [ ! -f .env ]; then
  cp .env.example .env
fi

# Build and start containers
sudo docker compose down || true
sudo docker compose build --no-cache
sudo docker compose up -d

# Configure Nginx
echo "Configurando Nginx para vps.multivus.com.br..."
sudo cp nginx/vps.multivus.com.br.conf /etc/nginx/sites-available/vps.multivus.com.br
sudo ln -sf /etc/nginx/sites-available/vps.multivus.com.br /etc/nginx/sites-enabled/vps.multivus.com.br

# Check SSL certificate
if [ ! -d "/etc/letsencrypt/live/vps.multivus.com.br" ]; then
  echo "Obtendo certificado SSL Let's Encrypt via Certbot..."
  sudo certbot --nginx -d vps.multivus.com.br --non-interactive --agree-tos --email admin@multivus.com.br --redirect || {
    echo "Aviso: Certbot pendente. Nginx será testado com as configurações atuais."
  }
fi

sudo nginx -t && sudo systemctl reload nginx
EOF

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}✅ Deploy Remoto Concluído!${NC}"
echo -e "Acesse: ${BLUE}https://vps.multivus.com.br${NC}"
echo -e "${BLUE}======================================================${NC}"
