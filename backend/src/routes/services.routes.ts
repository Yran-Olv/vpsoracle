import { Router } from 'express';
import { ServicesService } from '../services/services.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const services = await ServicesService.getServicesStatus();
    return res.json(services);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao consultar serviços', details: err.message });
  }
});

export default router;
