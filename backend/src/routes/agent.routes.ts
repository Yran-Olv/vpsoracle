import { Router } from 'express';
import { ServersService } from '../services/servers.service';

const router = Router();

// Ingest telemetry from remote agent
router.post('/report', (req, res) => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.headers['x-agent-token'] === 'string') {
    token = req.headers['x-agent-token'];
  }

  if (!token) {
    return res.status(401).json({ error: 'Token do agente não fornecido.' });
  }

  const server = ServersService.verifyAgentToken(token);
  if (!server) {
    return res.status(401).json({ error: 'Token de agente inválido, revogado ou servidor desativado.' });
  }

  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Payload de telemetria inválido.' });
    }

    ServersService.recordAgentTelemetry(server.id, payload);

    return res.json({
      status: 'ok',
      serverId: server.id,
      serverName: server.name,
      receivedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error(`Error processing agent telemetry for server ${server.id}:`, err);
    return res.status(500).json({ error: 'Erro ao processar telemetria', details: err.message });
  }
});

// Dynamic Agent Installation Script for Linux (Ubuntu/Debian/CentOS/Alpine/Oracle Linux)
router.get('/install.sh', (req, res) => {
  const token = String(req.query.token || '');
  const host = `${req.protocol}://${req.get('host')}`;

  res.setHeader('Content-Type', 'text/x-shellscript');
  res.send(`#!/bin/bash
# ==============================================================================
# Multivus Fleet Agent — Instalador Automático de Telemetria Remota
# Painel Central: ${host}
# ==============================================================================

set -e

PANEL_URL="${host}"
AGENT_TOKEN="${token}"

if [ -z "$AGENT_TOKEN" ]; then
  if [ -n "$1" ]; then
    AGENT_TOKEN="$1"
  else
    echo "❌ Erro: Token do agente não especificado."
    echo "Uso: curl -sSL '${host}/api/agent/install.sh?token=SEU_TOKEN' | bash"
    exit 1
  fi
fi

echo "🚀 Instalando Agente Multivus na VPS..."
INSTALL_DIR="/opt/multivus-agent"
mkdir -p "$INSTALL_DIR"

# 1. Criar script de coleta de telemetria ultraleve (apenas bash, procfs e curl)
cat << 'EOF' > "$INSTALL_DIR/agent.sh"
#!/bin/bash
PANEL_URL="__PANEL_URL__"
AGENT_TOKEN="__AGENT_TOKEN__"

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
curl -s -X POST "$PANEL_URL/api/agent/report" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $AGENT_TOKEN" \\
  -d "$PAYLOAD" >/dev/null 2>&1
EOF

sed -i "s|__PANEL_URL__|${host}|g" "$INSTALL_DIR/agent.sh"
sed -i "s|__AGENT_TOKEN__|${token}|g" "$INSTALL_DIR/agent.sh"
chmod +x "$INSTALL_DIR/agent.sh"

# 2. Configurar agendamento via Cron (a cada 1 minuto)
CRON_JOB="* * * * * $INSTALL_DIR/agent.sh >/dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "multivus-agent"; echo "$CRON_JOB") | crontab -

# 3. Executar primeiro envio imediato
echo "📡 Enviando primeira telemetria de teste ao painel..."
/bin/bash "$INSTALL_DIR/agent.sh"

echo "✅ Agente Multivus instalado e ativo com sucesso!"
`);
});

export default router;
