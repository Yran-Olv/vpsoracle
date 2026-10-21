import si from 'systeminformation';
import { db } from '../database';
import { config } from '../config';

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usagePercent: number;
    userPercent: number;
    systemPercent: number;
    cores: number;
    model: string;
    speed: number;
    load1m: number;
    load5m: number;
    load15m: number;
    temperature: number | null;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    availableBytes: number;
    usagePercent: number;
    swapTotalBytes: number;
    swapUsedBytes: number;
    swapUsagePercent: number;
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usagePercent: number;
    readBytesSec: number;
    writeBytesSec: number;
    iops: number;
    mounts: Array<{
      fs: string;
      type: string;
      size: number;
      used: number;
      available: number;
      usePercent: number;
      mount: string;
    }>;
  };
  network: {
    rxBytesSec: number;
    txBytesSec: number;
    totalRxBytes: number;
    totalTxBytes: number;
    interfaces: Array<{
      iface: string;
      ip4: string;
      rxBytes: number;
      txBytes: number;
      rxSec: number;
      txSec: number;
    }>;
  };
  system: {
    uptimeSeconds: number;
    processCount: number;
    hostname: string;
    platform: string;
    distro: string;
    kernel: string;
    arch: string;
  };
}

let lastDiskStats: { rIO: number; wIO: number; rBytes: number; wBytes: number; time: number } | null = null;
let lastNetStats: { rx: number; tx: number; time: number } | null = null;

export class MetricsService {
  static async collectMetrics(): Promise<SystemMetrics> {
    const now = Date.now();
    const [
      cpuData,
      cpuLoad,
      memData,
      fsSizeData,
      fsStatsData,
      netStatsData,
      netIfaces,
      osInfo,
      timeData,
      processes,
      cpuTemp
    ] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.fsStats().catch(() => ({ rx: 0, wx: 0, rx_sec: 0, wx_sec: 0, tx_sec: 0, ms: 0, rIO: 0, wIO: 0, rIO_sec: 0, wIO_sec: 0 })),
      si.networkStats().catch(() => []),
      si.networkInterfaces().catch(() => []),
      si.osInfo().catch(() => ({ hostname: 'multivusvps', platform: 'linux', distro: 'Ubuntu', kernel: '6.x', arch: 'aarch64' })),
      si.time(),
      si.processes().catch(() => ({ all: 0 })),
      si.cpuTemperature().catch(() => ({ main: null }))
    ]);

    // Primary disk usage (root filesystem)
    const rootFs = fsSizeData.find(f => f.mount === '/') || fsSizeData[0] || {
      size: 200 * 1024 * 1024 * 1024,
      used: 12 * 1024 * 1024 * 1024,
      available: 188 * 1024 * 1024 * 1024,
      use: 6,
      mount: '/',
      fs: '/dev/sda1',
      type: 'ext4'
    };

    // Calculate disk IOPS & bytes/sec
    let readBytesSec = 0;
    let writeBytesSec = 0;
    let iops = 0;

    if (fsStatsData) {
      const fsAny = fsStatsData as any;
      readBytesSec = fsAny.rx_sec || 0;
      writeBytesSec = fsAny.wx_sec || 0;
      iops = (fsAny.rIO_sec || 0) + (fsAny.wIO_sec || 0);

      if (readBytesSec === 0 && writeBytesSec === 0 && lastDiskStats) {
        const timeDiff = (now - lastDiskStats.time) / 1000;
        if (timeDiff > 0) {
          readBytesSec = Math.max(0, ((fsAny.rx || 0) - lastDiskStats.rBytes) / timeDiff);
          writeBytesSec = Math.max(0, ((fsAny.wx || 0) - lastDiskStats.wBytes) / timeDiff);
          iops = Math.max(0, (((fsAny.rIO || 0) + (fsAny.wIO || 0)) - (lastDiskStats.rIO + lastDiskStats.wIO)) / timeDiff);
        }
      }

      lastDiskStats = {
        rIO: fsAny.rIO || 0,
        wIO: fsAny.wIO || 0,
        rBytes: fsAny.rx || 0,
        wBytes: fsAny.wx || 0,
        time: now
      };
    }

    // Network calculations
    let totalRxBytes = 0;
    let totalTxBytes = 0;
    let rxBytesSec = 0;
    let txBytesSec = 0;

    const netInterfacesList = Array.isArray(netStatsData) ? netStatsData : [];
    for (const net of netInterfacesList) {
      totalRxBytes += net.rx_bytes || 0;
      totalTxBytes += net.tx_bytes || 0;
      rxBytesSec += Math.max(0, net.rx_sec || 0);
      txBytesSec += Math.max(0, net.tx_sec || 0);
    }

    if (rxBytesSec === 0 && txBytesSec === 0 && lastNetStats) {
      const timeDiff = (now - lastNetStats.time) / 1000;
      if (timeDiff > 0) {
        rxBytesSec = Math.max(0, (totalRxBytes - lastNetStats.rx) / timeDiff);
        txBytesSec = Math.max(0, (totalTxBytes - lastNetStats.tx) / timeDiff);
      }
    }
    lastNetStats = { rx: totalRxBytes, tx: totalTxBytes, time: now };

    const ifacesFormatted = Array.isArray(netIfaces) ? netIfaces.map(iface => {
      const stat = netInterfacesList.find(s => s.iface === iface.iface);
      return {
        iface: iface.iface,
        ip4: iface.ip4 || '',
        rxBytes: stat ? stat.rx_bytes : 0,
        txBytes: stat ? stat.tx_bytes : 0,
        rxSec: stat ? Math.max(0, stat.rx_sec || 0) : 0,
        txSec: stat ? Math.max(0, stat.tx_sec || 0) : 0
      };
    }) : [];

    const swapTotal = memData.swaptotal || 0;
    const swapUsed = memData.swapused || 0;
    const swapPercent = swapTotal > 0 ? (swapUsed / swapTotal) * 100 : 0;

    const metrics: SystemMetrics = {
      timestamp: now,
      cpu: {
        usagePercent: Math.round(cpuLoad.currentLoad * 10) / 10,
        userPercent: Math.round(cpuLoad.currentLoadUser * 10) / 10,
        systemPercent: Math.round(cpuLoad.currentLoadSystem * 10) / 10,
        cores: cpuData.cores || 4,
        model: cpuData.brand || cpuData.manufacturer || 'ARM Neoverse-N1',
        speed: cpuData.speed || 2.8,
        load1m: Math.round((cpuLoad.avgLoad || 0) * 100) / 100,
        load5m: Math.round((cpuLoad.avgLoad || 0) * 100) / 100,
        load15m: Math.round((cpuLoad.avgLoad || 0) * 100) / 100,
        temperature: cpuTemp.main && !isNaN(cpuTemp.main) ? Math.round(cpuTemp.main) : null
      },
      memory: {
        totalBytes: memData.total,
        usedBytes: memData.used,
        freeBytes: memData.free,
        availableBytes: memData.available || (memData.free + (memData.buffcache || 0)),
        usagePercent: Math.round(((memData.total - (memData.available || memData.free)) / memData.total) * 1000) / 10,
        swapTotalBytes: swapTotal,
        swapUsedBytes: swapUsed,
        swapUsagePercent: Math.round(swapPercent * 10) / 10
      },
      disk: {
        totalBytes: rootFs.size,
        usedBytes: rootFs.used,
        availableBytes: rootFs.available,
        usagePercent: Math.round((rootFs.use || 0) * 10) / 10,
        readBytesSec: Math.round(readBytesSec),
        writeBytesSec: Math.round(writeBytesSec),
        iops: Math.round(iops),
        mounts: fsSizeData.map(f => ({
          fs: f.fs,
          type: f.type,
          size: f.size,
          used: f.used,
          available: f.available,
          usePercent: Math.round((f.use || 0) * 10) / 10,
          mount: f.mount
        }))
      },
      network: {
        rxBytesSec: Math.round(rxBytesSec),
        txBytesSec: Math.round(txBytesSec),
        totalRxBytes,
        totalTxBytes,
        interfaces: ifacesFormatted
      },
      system: {
        uptimeSeconds: Math.floor(timeData.uptime || 0),
        processCount: processes.all || 0,
        hostname: osInfo.hostname || 'multivusvps',
        platform: osInfo.platform || 'linux',
        distro: osInfo.distro || 'Ubuntu',
        kernel: osInfo.kernel || '6.17.0',
        arch: osInfo.arch || 'aarch64'
      }
    };

    return metrics;
  }

  static saveRawMetrics(metrics: SystemMetrics): void {
    try {
      const stmt = db.prepare(`
        INSERT INTO metrics_raw (
          timestamp, cpu_percent, memory_used_bytes, memory_total_bytes, memory_percent,
          swap_used_bytes, swap_total_bytes, disk_used_bytes, disk_total_bytes, disk_percent,
          disk_read_bytes_sec, disk_write_bytes_sec, iops, net_rx_bytes_sec, net_tx_bytes_sec,
          load_1m, load_5m, load_15m, uptime_seconds, process_count, extra_json
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `);

      stmt.run(
        metrics.timestamp,
        metrics.cpu.usagePercent,
        metrics.memory.usedBytes,
        metrics.memory.totalBytes,
        metrics.memory.usagePercent,
        metrics.memory.swapUsedBytes,
        metrics.memory.swapTotalBytes,
        metrics.disk.usedBytes,
        metrics.disk.totalBytes,
        metrics.disk.usagePercent,
        metrics.disk.readBytesSec,
        metrics.disk.writeBytesSec,
        metrics.disk.iops,
        metrics.network.rxBytesSec,
        metrics.network.txBytesSec,
        metrics.cpu.load1m,
        metrics.cpu.load5m,
        metrics.cpu.load15m,
        metrics.system.uptimeSeconds,
        metrics.system.processCount,
        JSON.stringify({
          mounts: metrics.disk.mounts,
          temp: metrics.cpu.temperature
        })
      );
    } catch (err) {
      console.error('Error saving raw metrics:', err);
    }
  }

  static getHistory(range: '1h' | '6h' | '24h' | '7d' | '30d'): any[] {
    const now = Date.now();
    let startTime = now;
    let stepMs = 10000; // 10s

    switch (range) {
      case '1h':
        startTime = now - 3600 * 1000;
        stepMs = 30 * 1000; // 30s points
        break;
      case '6h':
        startTime = now - 6 * 3600 * 1000;
        stepMs = 3 * 60 * 1000; // 3min points
        break;
      case '24h':
        startTime = now - 24 * 3600 * 1000;
        stepMs = 10 * 60 * 1000; // 10min points
        break;
      case '7d':
        startTime = now - 7 * 24 * 3600 * 1000;
        stepMs = 60 * 60 * 1000; // 1h points
        break;
      case '30d':
        startTime = now - 30 * 24 * 3600 * 1000;
        stepMs = 4 * 60 * 60 * 1000; // 4h points
        break;
    }

    // Query aggregated or raw metrics depending on range
    const rows = db.prepare(`
      SELECT 
        (timestamp / ?) * ? as bucket_time,
        AVG(cpu_percent) as cpu,
        AVG(memory_percent) as memory,
        AVG(disk_percent) as disk,
        AVG(disk_read_bytes_sec) as disk_read_sec,
        AVG(disk_write_bytes_sec) as disk_write_sec,
        AVG(iops) as iops,
        AVG(net_rx_bytes_sec) as net_rx_sec,
        AVG(net_tx_bytes_sec) as net_tx_sec,
        AVG(load_1m) as load_1m
      FROM metrics_raw
      WHERE timestamp >= ?
      GROUP BY bucket_time
      ORDER BY bucket_time ASC
    `).all(stepMs, stepMs, startTime) as Array<{
      bucket_time: number;
      cpu: number;
      memory: number;
      disk: number;
      disk_read_sec: number;
      disk_write_sec: number;
      iops: number;
      net_rx_sec: number;
      net_tx_sec: number;
      load_1m: number;
    }>;

    return rows.map(r => ({
      time: r.bucket_time,
      cpu: Math.round((r.cpu || 0) * 10) / 10,
      memory: Math.round((r.memory || 0) * 10) / 10,
      disk: Math.round((r.disk || 0) * 10) / 10,
      diskReadSec: Math.round(r.disk_read_sec || 0),
      diskWriteSec: Math.round(r.disk_write_sec || 0),
      iops: Math.round(r.iops || 0),
      netRxSec: Math.round(r.net_rx_sec || 0),
      netTxSec: Math.round(r.net_tx_sec || 0),
      load1m: Math.round((r.load_1m || 0) * 100) / 100
    }));
  }

  static getStatsSummary(range: '1h' | '6h' | '24h' | '7d' | '30d') {
    const history = this.getHistory(range);
    if (history.length === 0) {
      return {
        cpu: { min: 0, max: 0, avg: 0, current: 0 },
        memory: { min: 0, max: 0, avg: 0, current: 0 },
        disk: { min: 0, max: 0, avg: 0, current: 0 },
        network: { maxRx: 0, maxTx: 0, avgRx: 0, avgTx: 0 }
      };
    }

    const cpus = history.map(h => h.cpu);
    const mems = history.map(h => h.memory);
    const disks = history.map(h => h.disk);
    const rxs = history.map(h => h.netRxSec);
    const txs = history.map(h => h.netTxSec);

    return {
      cpu: {
        min: Math.min(...cpus),
        max: Math.max(...cpus),
        avg: Math.round((cpus.reduce((a, b) => a + b, 0) / cpus.length) * 10) / 10,
        current: cpus[cpus.length - 1]
      },
      memory: {
        min: Math.min(...mems),
        max: Math.max(...mems),
        avg: Math.round((mems.reduce((a, b) => a + b, 0) / mems.length) * 10) / 10,
        current: mems[mems.length - 1]
      },
      disk: {
        min: Math.min(...disks),
        max: Math.max(...disks),
        avg: Math.round((disks.reduce((a, b) => a + b, 0) / disks.length) * 10) / 10,
        current: disks[disks.length - 1]
      },
      network: {
        maxRx: Math.max(...rxs),
        maxTx: Math.max(...txs),
        avgRx: Math.round(rxs.reduce((a, b) => a + b, 0) / rxs.length),
        avgTx: Math.round(txs.reduce((a, b) => a + b, 0) / txs.length)
      }
    };
  }

  static pruneOldMetrics(): void {
    const rawCutoff = Date.now() - config.rawMetricsRetentionDays * 24 * 3600 * 1000;
    const hourlyCutoff = Date.now() - config.hourlyMetricsRetentionDays * 24 * 3600 * 1000;

    try {
      db.prepare('DELETE FROM metrics_raw WHERE timestamp < ?').run(rawCutoff);
      db.prepare('DELETE FROM metrics_hourly WHERE timestamp < ?').run(hourlyCutoff);
    } catch (err) {
      console.error('Error pruning old metrics:', err);
    }
  }
}
