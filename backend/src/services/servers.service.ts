import crypto from 'crypto';
import net from 'net';
import { db } from '../database';

export interface ServerRecord {
  id: number;
  name: string;
  hostname: string | null;
  ip_address: string;
  port: number;
  provider: 'oracle' | 'generic' | 'aws' | 'digitalocean' | 'hetzner';
  environment: 'production' | 'staging' | 'backup';
  connection_type: 'local' | 'agent' | 'ssh';
  status: 'online' | 'offline' | 'pending' | 'disabled';
  is_default: number;
  os_info: string | null;
  agent_version: string | null;
  last_seen_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServerSummaryItem extends ServerRecord {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  containersCount: number;
  uptimeSeconds: number;
  isStale: boolean;
}

// In-memory cache for latest server telemetry snapshot
const serverLatestMetricsMap = new Map<number, {
  timestamp: number;
  metrics: any;
  containers?: any[];
  services?: any[];
}>();

export class ServersService {
  static getAllServers(): ServerSummaryItem[] {
    const rows = db.prepare('SELECT * FROM servers ORDER BY is_default DESC, id ASC').all() as any[];
    const now = Date.now();

    return rows.map((r) => {
      // Get cached snapshot or query latest raw metric
      let cpu = 0;
      let memory = 0;
      let disk = 0;
      let uptime = 0;
      let containersCount = 0;

      const cached = serverLatestMetricsMap.get(r.id);
      if (cached) {
        cpu = cached.metrics.cpu?.usagePercent || 0;
        memory = cached.metrics.memory?.usagePercent || 0;
        disk = cached.metrics.disk?.usagePercent || 0;
        uptime = cached.metrics.system?.uptimeSeconds || 0;
        containersCount = Array.isArray(cached.containers) ? cached.containers.length : 0;
      } else {
        const latest = db.prepare('SELECT cpu_percent, memory_percent, disk_percent, uptime_seconds FROM metrics_raw WHERE server_id = ? ORDER BY id DESC LIMIT 1').get(r.id) as any;
        if (latest) {
          cpu = Math.round(latest.cpu_percent * 10) / 10;
          memory = Math.round(latest.memory_percent * 10) / 10;
          disk = Math.round(latest.disk_percent * 10) / 10;
          uptime = latest.uptime_seconds || 0;
        }
      }

      // Check if telemetry is stale (> 3 minutes without heartbeat)
      let isStale = false;
      let computedStatus = r.status as 'online' | 'offline' | 'pending' | 'disabled';
      if (r.connection_type === 'agent' && r.status !== 'disabled') {
        if (!r.last_seen_at) {
          computedStatus = 'pending';
        } else {
          const lastSeenMs = new Date(r.last_seen_at).getTime();
          if (now - lastSeenMs > 3 * 60 * 1000) {
            isStale = true;
            computedStatus = 'offline';
          } else {
            computedStatus = 'online';
          }
        }
      }

      return {
        id: r.id,
        name: r.name,
        hostname: r.hostname,
        ip_address: r.ip_address,
        port: r.port || 443,
        provider: r.provider || 'generic',
        environment: r.environment || 'production',
        connection_type: r.connection_type || 'agent',
        status: computedStatus,
        is_default: r.is_default || 0,
        os_info: r.os_info,
        agent_version: r.agent_version,
        last_seen_at: r.last_seen_at,
        notes: r.notes,
        created_at: r.created_at,
        updated_at: r.updated_at,
        cpuPercent: cpu,
        memoryPercent: memory,
        diskPercent: disk,
        containersCount,
        uptimeSeconds: uptime,
        isStale
      };
    });
  }

  static getServerById(id: number): ServerRecord | null {
    const row = db.prepare('SELECT id, name, hostname, ip_address, port, provider, environment, connection_type, status, is_default, os_info, agent_version, last_seen_at, notes, created_at, updated_at FROM servers WHERE id = ?').get(id) as ServerRecord | undefined;
    return row || null;
  }

  static createServer(data: {
    name: string;
    hostname?: string;
    ip_address: string;
    port?: number;
    provider?: 'oracle' | 'generic' | 'aws' | 'digitalocean' | 'hetzner';
    environment?: 'production' | 'staging' | 'backup';
    connection_type?: 'local' | 'agent' | 'ssh';
    notes?: string;
  }): { server: ServerRecord; rawAgentToken: string } {
    const rawAgentToken = `mvs_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawAgentToken).digest('hex');

    const stmt = db.prepare(`
      INSERT INTO servers (
        name, hostname, ip_address, port, provider, environment, connection_type, api_key_hash, status, is_default, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
    `);

    const result = stmt.run(
      data.name.trim(),
      data.hostname ? data.hostname.trim() : null,
      data.ip_address.trim(),
      data.port || 443,
      data.provider || 'generic',
      data.environment || 'production',
      data.connection_type || 'agent',
      tokenHash,
      data.notes ? data.notes.trim() : null
    );

    const serverId = Number(result.lastInsertRowid);
    const server = this.getServerById(serverId)!;

    return { server, rawAgentToken };
  }

  static updateServer(id: number, data: {
    name?: string;
    hostname?: string;
    ip_address?: string;
    port?: number;
    provider?: 'oracle' | 'generic' | 'aws' | 'digitalocean' | 'hetzner';
    environment?: 'production' | 'staging' | 'backup';
    notes?: string;
    status?: 'online' | 'offline' | 'pending' | 'disabled';
  }): ServerRecord | null {
    const existing = this.getServerById(id);
    if (!existing) return null;

    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const hostname = data.hostname !== undefined ? data.hostname.trim() : existing.hostname;
    const ip_address = data.ip_address !== undefined ? data.ip_address.trim() : existing.ip_address;
    const port = data.port !== undefined ? data.port : existing.port;
    const provider = data.provider !== undefined ? data.provider : existing.provider;
    const environment = data.environment !== undefined ? data.environment : existing.environment;
    const notes = data.notes !== undefined ? data.notes.trim() : existing.notes;
    const status = data.status !== undefined ? data.status : existing.status;

    db.prepare(`
      UPDATE servers SET
        name = ?, hostname = ?, ip_address = ?, port = ?, provider = ?, environment = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, hostname, ip_address, port, provider, environment, notes, status, id);

    return this.getServerById(id);
  }

  static rotateAgentToken(id: number): { rawAgentToken: string } | null {
    const existing = this.getServerById(id);
    if (!existing) return null;

    const rawAgentToken = `mvs_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawAgentToken).digest('hex');

    db.prepare(`
      UPDATE servers SET api_key_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(tokenHash, id);

    return { rawAgentToken };
  }

  static toggleStatus(id: number): ServerRecord | null {
    const existing = this.getServerById(id);
    if (!existing) return null;

    const newStatus = existing.status === 'disabled' ? 'active' : 'disabled';
    db.prepare('UPDATE servers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);

    return this.getServerById(id);
  }

  static deleteServer(id: number, deleteHistory = false): boolean {
    const existing = this.getServerById(id);
    if (!existing) return false;

    // Do not allow deleting the primary default server
    if (existing.is_default === 1) {
      throw new Error('Não é permitido excluir o servidor principal configurado como padrão.');
    }

    if (deleteHistory) {
      db.prepare('DELETE FROM metrics_raw WHERE server_id = ?').run(id);
      db.prepare('DELETE FROM metrics_hourly WHERE server_id = ?').run(id);
      db.prepare('DELETE FROM checkup_reports WHERE server_id = ?').run(id);
      db.prepare('DELETE FROM incidents WHERE server_id = ?').run(id);
      db.prepare('DELETE FROM alerts_history WHERE server_id = ?').run(id);
      db.prepare('DELETE FROM alerts_config WHERE server_id = ?').run(id);
    }

    db.prepare('DELETE FROM user_servers WHERE server_id = ?').run(id);
    db.prepare('DELETE FROM servers WHERE id = ?').run(id);
    serverLatestMetricsMap.delete(id);

    return true;
  }

  static async testConnection(id: number): Promise<{
    reachable: boolean;
    latencyMs: number;
    message: string;
    status: 'online' | 'offline' | 'pending' | 'disabled';
    agentVersion?: string;
  }> {
    const server = this.getServerById(id);
    if (!server) {
      return { reachable: false, latencyMs: 0, message: 'Servidor não encontrado.', status: 'offline' };
    }

    if (server.connection_type === 'local') {
      return { reachable: true, latencyMs: 1, message: 'Host Local ativo e operacional.', status: 'online', agentVersion: server.agent_version || 'native-1.0.0' };
    }

    // Check last seen heartbeat for agent
    const now = Date.now();
    const lastSeenMs = server.last_seen_at ? new Date(server.last_seen_at).getTime() : 0;
    const diffSec = Math.round((now - lastSeenMs) / 1000);

    if (server.last_seen_at && diffSec <= 180) {
      return {
        reachable: true,
        latencyMs: 15,
        message: `Agente conectado e ativo (última comunicação há ${diffSec}s).`,
        status: 'online',
        agentVersion: server.agent_version || '2.0.0'
      };
    }

    // Fallback: Test TCP port connection
    const start = Date.now();
    const port = server.port || 22;
    const reachable = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2500);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.connect(port, server.ip_address);
    });
    const latency = Date.now() - start;

    if (reachable) {
      return {
        reachable: true,
        latencyMs: latency,
        message: `Porta ${port} acessível no IP ${server.ip_address} (${latency}ms). Aguardando envio de métricas pelo agente.`,
        status: server.status === 'disabled' ? 'disabled' : 'pending'
      };
    }

    return {
      reachable: false,
      latencyMs: latency,
      message: `Não foi possível conectar ao IP ${server.ip_address}:${port}. Verifique o firewall ou instale o agente.`,
      status: 'offline'
    };
  }

  static verifyAgentToken(rawToken: string): ServerRecord | null {
    if (!rawToken || typeof rawToken !== 'string') return null;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const row = db.prepare('SELECT * FROM servers WHERE api_key_hash = ? AND status != ?').get(tokenHash, 'disabled') as ServerRecord | undefined;
    return row || null;
  }

  static recordAgentTelemetry(serverId: number, payload: {
    metrics?: any;
    system?: any;
    cpu?: any;
    memory?: any;
    disk?: any;
    network?: any;
    containers?: any[];
    services?: any[];
    agentVersion?: string;
  }): void {
    const now = Date.now();
    const data = (payload.metrics && typeof payload.metrics === 'object') ? payload.metrics : payload;

    const osDistro = data.system?.distro || data.system?.os || 'Linux';
    const osArch = data.system?.arch || '';
    const osInfo = `${osDistro} (${osArch})`.trim();
    const agentVersion = payload.agentVersion || data.agentVersion || '1.0.0';

    // Update server status and last seen
    db.prepare(`
      UPDATE servers SET
        status = 'online',
        last_seen_at = CURRENT_TIMESTAMP,
        os_info = COALESCE(?, os_info),
        agent_version = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(osInfo, agentVersion, serverId);

    // Cache latest snapshot in memory for fast SSE and REST access
    serverLatestMetricsMap.set(serverId, {
      timestamp: now,
      metrics: {
        timestamp: now,
        system: data.system || {},
        cpu: data.cpu || { usagePercent: 0, cores: 1, load1m: 0, load5m: 0, load15m: 0 },
        memory: data.memory || { totalBytes: 0, usedBytes: 0, usagePercent: 0 },
        disk: data.disk || { totalBytes: 0, usedBytes: 0, usagePercent: 0, iops: 0, readBytesSec: 0, writeBytesSec: 0 },
        network: data.network || { rxBytesSec: 0, txBytesSec: 0, totalRxBytes: 0, totalTxBytes: 0 }
      },
      containers: data.containers || payload.containers || [],
      services: data.services || payload.services || []
    });

    // Record into metrics_raw
    try {
      const cpuPercent = data.cpu?.usagePercent || 0;
      const memUsed = data.memory?.usedBytes || 0;
      const memTotal = data.memory?.totalBytes || 1;
      const memPercent = data.memory?.usagePercent || Math.round((memUsed / memTotal) * 100);
      const swapUsed = data.memory?.swapUsedBytes || 0;
      const swapTotal = data.memory?.swapTotalBytes || 0;
      const diskUsed = data.disk?.usedBytes || 0;
      const diskTotal = data.disk?.totalBytes || 1;
      const diskPercent = data.disk?.usagePercent || Math.round((diskUsed / diskTotal) * 100);
      const diskR = data.disk?.readBytesSec || 0;
      const diskW = data.disk?.writeBytesSec || 0;
      const iops = data.disk?.iops || 0;
      const netRx = data.network?.rxBytesSec || 0;
      const netTx = data.network?.txBytesSec || 0;
      const load1 = data.cpu?.load1m || 0;
      const load5 = data.cpu?.load5m || 0;
      const load15 = data.cpu?.load15m || 0;
      const uptime = data.system?.uptimeSeconds || 0;
      const procCount = data.system?.processesCount || 0;

      db.prepare(`
        INSERT INTO metrics_raw (
          server_id, timestamp, cpu_percent, memory_used_bytes, memory_total_bytes, memory_percent,
          swap_used_bytes, swap_total_bytes, disk_used_bytes, disk_total_bytes, disk_percent,
          disk_read_bytes_sec, disk_write_bytes_sec, iops, net_rx_bytes_sec, net_tx_bytes_sec,
          load_1m, load_5m, load_15m, uptime_seconds, process_count, extra_json
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `).run(
        serverId, now, cpuPercent, memUsed, memTotal, memPercent,
        swapUsed, swapTotal, diskUsed, diskTotal, diskPercent,
        diskR, diskW, iops, netRx, netTx,
        load1, load5, load15, uptime, procCount,
        JSON.stringify({ containersCount: payload.containers?.length || 0 })
      );
    } catch (err) {
      console.error(`Error saving raw metrics for server ${serverId}:`, err);
    }
  }

  static getCachedServerMetrics(serverId: number) {
    return serverLatestMetricsMap.get(serverId) || null;
  }
}
