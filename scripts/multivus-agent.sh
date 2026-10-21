#!/bin/bash
# ==============================================================================
# Multivus Fleet Agent — Script Standalone de Telemetria Remota para Linux
# ==============================================================================

set -e

PANEL_URL="${1:-https://vps.multivus.com.br}"
AGENT_TOKEN="${2:-$MULTIVUS_AGENT_TOKEN}"

if [ -z "$AGENT_TOKEN" ]; then
  echo "Uso: ./multivus-agent.sh <URL_DO_PAINEL> <TOKEN_DO_AGENTE>"
  echo "Exemplo: ./multivus-agent.sh https://vps.multivus.com.br mvs_abcdef123456"
  exit 1
fi

# Coletar Uptime e Load Average
UPTIME_SEC=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0)
LOAD_1=$(awk '{print $1}' /proc/loadavg 2>/dev/null || echo 0)
LOAD_5=$(awk '{print $2}' /proc/loadavg 2>/dev/null || echo 0)
LOAD_15=$(awk '{print $3}' /proc/loadavg 2>/dev/null || echo 0)
CORES=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 1)

# Coletar Memória (/proc/meminfo)
MEM_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}' 2>/dev/null || echo 1)
MEM_FREE_KB=$(grep MemFree /proc/meminfo | awk '{print $2}' 2>/dev/null || echo 0)
MEM_AVAIL_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}' 2>/dev/null || echo "$MEM_FREE_KB")
SWAP_TOTAL_KB=$(grep SwapTotal /proc/meminfo | awk '{print $2}' 2>/dev/null || echo 0)
SWAP_FREE_KB=$(grep SwapFree /proc/meminfo | awk '{print $2}' 2>/dev/null || echo 0)

MEM_TOTAL_BYTES=$((MEM_TOTAL_KB * 1024))
MEM_AVAIL_BYTES=$((MEM_AVAIL_KB * 1024))
MEM_USED_BYTES=$((MEM_TOTAL_BYTES - MEM_AVAIL_BYTES))
MEM_PERCENT=$((MEM_USED_BYTES * 100 / MEM_TOTAL_BYTES))

SWAP_TOTAL_BYTES=$((SWAP_TOTAL_KB * 1024))
SWAP_USED_BYTES=$(((SWAP_TOTAL_KB - SWAP_FREE_KB) * 1024))

# Coletar Disco (Partição raiz)
DISK_LINE=$(df -B1 / | tail -n 1)
DISK_TOTAL_BYTES=$(echo "$DISK_LINE" | awk '{print $2}')
DISK_USED_BYTES=$(echo "$DISK_LINE" | awk '{print $3}')
DISK_PERCENT=$(echo "$DISK_LINE" | awk '{print $5}' | sed 's/%//')

# Coletar CPU percent (amostra de 0.5s)
CPU1=$(grep '^cpu ' /proc/stat)
sleep 0.5
CPU2=$(grep '^cpu ' /proc/stat)
IDLE1=$(echo "$CPU1" | awk '{print $5}')
TOTAL1=$(echo "$CPU1" | awk '{print $2+$3+$4+$5+$6+$7+$8}')
IDLE2=$(echo "$CPU2" | awk '{print $5}')
TOTAL2=$(echo "$CPU2" | awk '{print $2+$3+$4+$5+$6+$7+$8}')
DIFF_IDLE=$((IDLE2 - IDLE1))
DIFF_TOTAL=$((TOTAL2 - TOTAL1))
if [ "$DIFF_TOTAL" -gt 0 ]; then
  CPU_PERCENT=$(( (DIFF_TOTAL - DIFF_IDLE) * 100 / DIFF_TOTAL ))
else
  CPU_PERCENT=0
fi

# Sistema Operacional
DISTRO=$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"' || uname -s)
ARCH=$(uname -m)

# Docker Containers (se docker socket existir)
CONTAINERS_JSON="[]"
if [ -S /var/run/docker.sock ] && command -v docker >/dev/null 2>&1; then
  CONTAINERS_JSON=$(docker ps --format '{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}","status":"{{.Status}}"}' 2>/dev/null | jq -s . 2>/dev/null || echo "[]")
fi

# Construir JSON Payload
PAYLOAD=$(cat << JSON
{
  "agentVersion": "1.0.0",
  "system": {
    "distro": "$DISTRO",
    "arch": "$ARCH",
    "uptimeSeconds": $UPTIME_SEC,
    "processesCount": $(ls -d /proc/[0-9]* 2>/dev/null | wc -l)
  },
  "cpu": {
    "usagePercent": $CPU_PERCENT,
    "cores": $CORES,
    "load1m": $LOAD_1,
    "load5m": $LOAD_5,
    "load15m": $LOAD_15
  },
  "memory": {
    "totalBytes": $MEM_TOTAL_BYTES,
    "usedBytes": $MEM_USED_BYTES,
    "usagePercent": $MEM_PERCENT,
    "swapTotalBytes": $SWAP_TOTAL_BYTES,
    "swapUsedBytes": $SWAP_USED_BYTES
  },
  "disk": {
    "totalBytes": $DISK_TOTAL_BYTES,
    "usedBytes": $DISK_USED_BYTES,
    "usagePercent": $DISK_PERCENT,
    "iops": 0
  },
  "network": {
    "rxBytesSec": 0,
    "txBytesSec": 0
  },
  "containers": $CONTAINERS_JSON
}
JSON
)

# Enviar para o Painel Central via HTTPS
curl -s -X POST "$PANEL_URL/api/agent/report" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -d "$PAYLOAD"
