import { Router } from 'express';
import { ServicesService } from '../services/services.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const serverId = parseInt(req.query.serverId as string || '1', 10);
    const services = await ServicesService.getServicesStatus(serverId);
    return res.json(services);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao consultar serviços', details: err.message });
  }
});

export default router;
