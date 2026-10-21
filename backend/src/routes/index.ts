import { Router } from 'express';
import authRoutes from './auth.routes';
import metricsRoutes from './metrics.routes';
import dockerRoutes from './docker.routes';
import servicesRoutes from './services.routes';
import domainsRoutes from './domains.routes';
import oracleRoutes from './oracle.routes';
import newsRoutes from './news.routes';
import alertsRoutes from './alerts.routes';
import riskRoutes from './risk.routes';
import checkupRoutes from './checkup.routes';
import incidentsRoutes from './incidents.routes';
import settingsRoutes from './settings.routes';
import reportRoutes from './report.routes';
import { MetricsService } from '../services/metrics.service';
import { authMiddleware } from '../middleware/auth.middleware';
import si from 'systeminformation';

import serversRoutes from './servers.routes';
import agentRoutes from './agent.routes';
import usersRoutes from './users.routes';
import { ServersService } from '../services/servers.service';

const router = Router();

// Public Health Check Endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'VPS Multivus Monitor API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Server Info Endpoint (supports serverId)
router.get('/server', authMiddleware, async (req, res) => {
  try {
    const serverId = parseInt(req.query.serverId as string || '1', 10);

    if (serverId > 1) {
      const server = ServersService.getServerById(serverId);
      if (!server) return res.status(404).json({ error: 'Servidor não encontrado.' });

      const cached = ServersService.getCachedServerMetrics(serverId);
      return res.json({
        id: server.id,
        name: server.name,
        hostname: server.hostname || server.name,
        platform: 'linux',
        distro: server.os_info || 'Linux Remoto',
        release: server.agent_version || '1.0.0',
        kernel: 'Linux',
        arch: server.os_info?.includes('ARM') ? 'aarch64' : 'x86_64',
        cpu: {
          manufacturer: server.provider === 'oracle' ? 'Ampere' : 'Generic',
          brand: server.provider === 'oracle' ? 'Neoverse-N1' : 'vCPU',
          cores: cached?.metrics?.cpu?.cores || 2,
          speed: 2.4
        },
        memory: {
          totalGb: Math.round(((cached?.metrics?.memory?.totalBytes || (4 * 1024**3)) / (1024**3)) * 10) / 10,
          availableGb: Math.round((((cached?.metrics?.memory?.totalBytes || (4 * 1024**3)) - (cached?.metrics?.memory?.usedBytes || 0)) / (1024**3)) * 10) / 10
        },
        disks: [
          {
            fs: '/dev/root',
            type: 'ext4',
            sizeGb: Math.round(((cached?.metrics?.disk?.totalBytes || (50 * 1024**3)) / (1024**3)) * 10) / 10,
            usedGb: Math.round(((cached?.metrics?.disk?.usedBytes || (10 * 1024**3)) / (1024**3)) * 10) / 10,
            usePercent: cached?.metrics?.disk?.usagePercent || 20,
            mount: '/'
          }
        ],
        uptimeSeconds: cached?.metrics?.system?.uptimeSeconds || 3600,
        timezone: 'America/Sao_Paulo'
      });
    }

    const [osInfo, cpu, mem, disk, time] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.time()
    ]);

    return res.json({
      id: 1,
      hostname: osInfo.hostname,
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      kernel: osInfo.kernel,
      arch: osInfo.arch,
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed
      },
      memory: {
        totalGb: Math.round((mem.total / (1024**3)) * 10) / 10,
        availableGb: Math.round(((mem.available || mem.free) / (1024**3)) * 10) / 10
      },
      disks: disk.map(d => ({
        fs: d.fs,
        type: d.type,
        sizeGb: Math.round((d.size / (1024**3)) * 10) / 10,
        usedGb: Math.round((d.used / (1024**3)) * 10) / 10,
        usePercent: d.use,
        mount: d.mount
      })),
      uptimeSeconds: time.uptime,
      timezone: time.timezone
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter informações do servidor', details: err.message });
  }
});

// Mount Subroutes
router.use('/auth', authRoutes);
router.use('/servers', serversRoutes);
router.use('/agent', agentRoutes);
router.use('/users', usersRoutes);
router.use('/metrics', metricsRoutes);
router.use('/docker', dockerRoutes);
router.use('/services', servicesRoutes);
router.use('/domains', domainsRoutes);
router.use('/ssl', domainsRoutes);
router.use('/oracle', oracleRoutes);
router.use('/news', newsRoutes);
router.use('/alerts', alertsRoutes);
router.use('/risk', riskRoutes);
router.use('/checkup', checkupRoutes);
router.use('/incidents', incidentsRoutes);
router.use('/settings', settingsRoutes);
router.use('/report', reportRoutes);

export default router;
