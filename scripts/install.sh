#!/bin/bash
# ==============================================================================
# VPS MULTIVUS — Script de Instalação Automática
# Oracle Cloud Always Free VPS (vps.multivus.com.br)
# ==============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}🚀 Instalador do VPS Multivus — Monitor Oracle Cloud${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Check Root / Sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Erro: Execute este script como root ou via sudo.${NC}"
  exit 1
fi

INSTALL_DIR="/opt/vps-multivus"
DOMAIN="vps.multivus.com.br"

echo -e "${YELLOW}1/6. Verificando dependências (Docker, Docker Compose, Nginx, Certbot)...${NC}"
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx rsync

if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Instalando Docker Engine...${NC}"
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm -f get-docker.sh
fi

echo -e "${YELLOW}2/6. Criando diretório de instalação em ${INSTALL_DIR}...${NC}"
mkdir -p "${INSTALL_DIR}"
cp -r . "${INSTALL_DIR}/" || true
cd "${INSTALL_DIR}"

if [ ! -f .env ]; then
  cp .env.example .env
fi

echo -e "${YELLOW}3/6. Construindo e iniciando containers Docker...${NC}"
docker compose down || true
docker compose build --no-cache
docker compose up -d

echo -e "${YELLOW}4/6. Configurando Nginx Reverse Proxy para ${DOMAIN}...${NC}"
cp nginx/vps.multivus.com.br.conf /etc/nginx/sites-available/vps.multivus.com.br.conf || true
ln -sf /etc/nginx/sites-available/vps.multivus.com.br.conf /etc/nginx/sites-enabled/vps.multivus.com.br.conf

# 5. SSL with Certbot
echo -e "${YELLOW}5/6. Verificando Certificado SSL Let's Encrypt...${NC}"
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo -e "${YELLOW}Gerando certificado SSL inicial via Certbot...${NC}"
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email admin@multivus.com.br --redirect || {
    echo -e "${YELLOW}Aviso: Certbot automático pendente. Verifique o apontamento DNS para ${DOMAIN}.${NC}"
  }
fi

nginx -t && systemctl reload nginx

echo -e "${YELLOW}6/6. Configurando Firewall UFW...${NC}"
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}✅ Instalação Concluída com Sucesso!${NC}"
echo -e "Acesse o painel: ${BLUE}https://${DOMAIN}${NC}"
echo -e "Usuário Padrão: ${GREEN}admin${NC}"
echo -e "Senha Padrão:   ${GREEN}Systemzap@2025${NC}"
echo -e "${BLUE}======================================================${NC}"
