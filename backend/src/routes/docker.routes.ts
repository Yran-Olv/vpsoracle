import { Router } from 'express';
import { DockerService } from '../services/docker.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const serverId = parseInt(req.query.serverId as string || '1', 10);
    const data = await DockerService.getContainers(serverId);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao consultar Docker', details: err.message });
  }
});

router.get('/containers', authMiddleware, async (req, res) => {
  const serverId = parseInt(req.query.serverId as string || '1', 10);
  const data = await DockerService.getContainers(serverId);
  return res.json(data.containers);
});

router.get('/containers/:id/logs', authMiddleware, async (req, res) => {
  const containerId = String(req.params.id);
  const lines = parseInt(req.query.lines as string || '100', 10);
  const logs = await DockerService.getContainerLogs(containerId, lines);
  return res.json({ id: containerId, logs });
});

router.get('/containers/:id/inspect', authMiddleware, async (req, res) => {
  const containerId = String(req.params.id);
  const data = await DockerService.inspectContainer(containerId);
  if (!data) {
    return res.status(404).json({ error: 'Container não encontrado' });
  }
  return res.json(data);
});

export default router;
