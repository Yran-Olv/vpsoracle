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

// Server Info Endpoint
router.get('/server', authMiddleware, async (req, res) => {
  try {
    const [osInfo, cpu, mem, disk, time] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.time()
    ]);

    return res.json({
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
