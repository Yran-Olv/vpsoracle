import { Router } from 'express';
import { AuthService } from '../services/auth.service';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const result = await AuthService.login(username, password);
  if (!result) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  return res.json(result);
});

router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  const user = AuthService.getUserById(req.user.id);
  return res.json({ user });
});

router.post('/change-password', authMiddleware, auditMiddleware('CHANGE_PASSWORD'), async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  }

  const success = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
  if (!success) {
    return res.status(400).json({ error: 'Senha atual incorreta.' });
  }

  return res.json({ message: 'Senha alterada com sucesso.' });
});

export default router;
