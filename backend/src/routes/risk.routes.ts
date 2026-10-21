import { Router } from 'express';
import { RiskEngineService } from '../services/risk.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const report = await RiskEngineService.evaluateRisk();
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao avaliar risco', details: err.message });
  }
});

export default router;
