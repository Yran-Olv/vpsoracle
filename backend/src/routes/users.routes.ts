import { Router } from 'express';
import { UsersService } from '../services/users.service';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

// List users (Admin only)
router.get('/', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const users = UsersService.getAllUsers();
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao listar usuários', details: err.message });
  }
});

// Create user (Admin only)
router.post('/', authMiddleware, requireRole('admin'), auditMiddleware('CREATE_USER'), (req: AuthenticatedRequest, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
    }

    const newUser = UsersService.createUser({
      username,
      passwordPlain: password,
      role: role || 'viewer'
    });

    return res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: newUser });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Update user role or status (Admin only)
router.put('/:id', authMiddleware, requireRole('admin'), auditMiddleware('UPDATE_USER'), (req: AuthenticatedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de usuário inválido' });

  try {
    const requesterId = req.user?.id || 0;
    const updated = UsersService.updateUser(id, req.body, requesterId);
    return res.json({ message: 'Usuário atualizado com sucesso.', user: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Reset user password (Admin only)
router.post('/:id/password', authMiddleware, requireRole('admin'), auditMiddleware('RESET_USER_PASSWORD'), (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de usuário inválido' });

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Nova senha é obrigatória.' });
  }

  try {
    UsersService.resetPassword(id, password);
    return res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Delete user (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), auditMiddleware('DELETE_USER'), (req: AuthenticatedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID de usuário inválido' });

  try {
    const requesterId = req.user?.id || 0;
    UsersService.deleteUser(id, requesterId);
    return res.json({ message: 'Usuário excluído com sucesso.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
