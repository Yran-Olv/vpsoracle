import { Router } from 'express';
import { AlertsService } from '../services/alerts.service';
import { RiskEngineService } from '../services/risk.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

// Alerts Configuration
router.get('/', authMiddleware, (req, res) => {
  const configs = AlertsService.getAlertsConfig();
  return res.json(configs);
});

router.put('/:id', authMiddleware, auditMiddleware('UPDATE_ALERT_CONFIG'), (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { thresholdValue, severity, isEnabled } = req.body;

  if (typeof thresholdValue !== 'number') {
    return res.status(400).json({ error: 'Limiar numérico inválido.' });
  }

  const success = AlertsService.updateAlertConfig(id, thresholdValue, severity, isEnabled);
  if (!success) {
    return res.status(404).json({ error: 'Configuração de alerta não encontrada.' });
  }
  return res.json({ message: 'Alerta atualizado com sucesso.' });
});

// Alert History
router.get('/history', authMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit as string || '50', 10);
  const history = AlertsService.getAlertHistory(limit);
  return res.json(history);
});

router.post('/history/:id/ack', authMiddleware, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const success = AlertsService.acknowledgeAlert(id);
  if (!success) {
    return res.status(404).json({ error: 'Alerta não encontrado.' });
  }
  return res.json({ message: 'Alerta reconhecido.' });
});

export default router;
