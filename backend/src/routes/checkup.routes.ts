import { Router } from 'express';
import { CheckupService } from '../services/checkup.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

router.post('/', authMiddleware, auditMiddleware('RUN_CHECKUP'), async (req, res) => {
  try {
    const report = await CheckupService.runFullCheckup();
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao executar checkup', details: err.message });
  }
});

router.get('/latest', authMiddleware, (req, res) => {
  try {
    const report = CheckupService.getLatestReport();
    if (!report) {
      return res.status(404).json({ error: 'Nenhum checkup executado ainda.' });
    }
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter relatório de checkup', details: err.message });
  }
});

export default router;
