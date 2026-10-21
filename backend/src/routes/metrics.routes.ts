import { Router } from 'express';
import { MetricsService } from '../services/metrics.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Real-time current metrics
router.get('/', authMiddleware, async (req, res) => {
  try {
    const metrics = await MetricsService.collectMetrics();
    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao coletar métricas', details: err.message });
  }
});

// Specific metric endpoints
router.get('/cpu', authMiddleware, async (req, res) => {
  const metrics = await MetricsService.collectMetrics();
  return res.json(metrics.cpu);
});

router.get('/memory', authMiddleware, async (req, res) => {
  const metrics = await MetricsService.collectMetrics();
  return res.json(metrics.memory);
});

router.get('/disk', authMiddleware, async (req, res) => {
  const metrics = await MetricsService.collectMetrics();
  return res.json(metrics.disk);
});

router.get('/network', authMiddleware, async (req, res) => {
  const metrics = await MetricsService.collectMetrics();
  return res.json(metrics.network);
});

// Historical metrics by range
router.get('/history', authMiddleware, (req, res) => {
  const range = (req.query.range as '1h' | '6h' | '24h' | '7d' | '30d') || '1h';
  const history = MetricsService.getHistory(range);
  const summary = MetricsService.getStatsSummary(range);
  return res.json({ range, summary, points: history });
});

export default router;
