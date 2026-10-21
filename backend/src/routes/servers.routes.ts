import { Router } from 'express';
import { ServersService } from '../services/servers.service';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

// List all servers (Consolidated fleet / server cards)
router.get('/', authMiddleware, (req, res) => {
  try {
    const servers = ServersService.getAllServers();
    return res.json(servers);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao listar servidores', details: err.message });
  }
});

// Get single server details
router.get('/:id', authMiddleware, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de servidor inválido' });

  const server = ServersService.getServerById(id);
  if (!server) return res.status(404).json({ error: 'Servidor não encontrado' });

  return res.json(server);
});

// Create new server (Admin & Operator only)
router.post('/', authMiddleware, requireRole('admin', 'operator'), auditMiddleware('CREATE_SERVER'), (req, res) => {
  try {
    const { name, hostname, ip_address, port, provider, environment, connection_type, notes } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nome do servidor é obrigatório.' });
    }

    if (!ip_address || typeof ip_address !== 'string' || ip_address.trim().length === 0) {
      return res.status(400).json({ error: 'Endereço IP ou hostname é obrigatório.' });
    }

    const { server, rawAgentToken } = ServersService.createServer({
      name,
      hostname,
      ip_address,
      port: port ? parseInt(port, 10) : 443,
      provider: provider || 'generic',
      environment: environment || 'production',
      connection_type: connection_type || 'agent',
      notes
    });

    return res.status(201).json({
      message: 'Servidor cadastrado com sucesso!',
      server,
      rawAgentToken // Returned once at creation so user can copy installation script
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao cadastrar servidor', details: err.message });
  }
});

// Update server details
router.put('/:id', authMiddleware, requireRole('admin', 'operator'), auditMiddleware('UPDATE_SERVER'), (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de servidor inválido' });

  try {
    const updated = ServersService.updateServer(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Servidor não encontrado.' });

    return res.json({ message: 'Servidor atualizado com sucesso.', server: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar servidor', details: err.message });
  }
});

// Rotate agent token (Admin only)
router.post('/:id/token/rotate', authMiddleware, requireRole('admin'), auditMiddleware('ROTATE_SERVER_TOKEN'), (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de servidor inválido' });

  try {
    const result = ServersService.rotateAgentToken(id);
    if (!result) return res.status(404).json({ error: 'Servidor não encontrado.' });

    return res.json({
      message: 'Token de autenticação do agente rotacionado com sucesso!',
      rawAgentToken: result.rawAgentToken
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao rotacionar token', details: err.message });
  }
});

// Toggle server status (Active / Disabled)
router.post('/:id/toggle-status', authMiddleware, requireRole('admin', 'operator'), auditMiddleware('TOGGLE_SERVER_STATUS'), (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de servidor inválido' });

  try {
    const server = ServersService.toggleStatus(id);
    if (!server) return res.status(404).json({ error: 'Servidor não encontrado.' });

    return res.json({ message: `Servidor ${server.status === 'disabled' ? 'desativado' : 'ativado'} com sucesso.`, server });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao alterar status do servidor', details: err.message });
  }
});

// Test connection
router.post('/:id/test-connection', authMiddleware, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de servidor inválido' });

  try {
    const testResult = await ServersService.testConnection(id);
    return res.json(testResult);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao testar conexão', details: err.message });
  }
});

// Delete server (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), auditMiddleware('DELETE_SERVER'), (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de servidor inválido' });

  const deleteHistory = req.query.deleteHistory === 'true';

  try {
    const success = ServersService.deleteServer(id, deleteHistory);
    if (!success) return res.status(404).json({ error: 'Servidor não encontrado.' });

    return res.json({ message: 'Servidor removido com sucesso.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
