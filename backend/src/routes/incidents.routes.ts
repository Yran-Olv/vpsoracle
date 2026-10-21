import { Router } from 'express';
import { AlertsService } from '../services/alerts.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit as string || '50', 10);
  const incidents = AlertsService.getIncidents(limit);
  return res.json(incidents);
});

export default router;
