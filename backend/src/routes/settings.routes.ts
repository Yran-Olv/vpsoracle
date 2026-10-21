import { Router } from 'express';
import { db } from '../database';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM system_settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return res.json(settings);
});

router.post('/', authMiddleware, auditMiddleware('UPDATE_SETTINGS'), (req, res) => {
  const newSettings: Record<string, string> = req.body;
  if (!newSettings || typeof newSettings !== 'object') {
    return res.status(400).json({ error: 'Configurações inválidas.' });
  }

  const upsert = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(newSettings)) {
      upsert.run(k, String(v));
    }
  });

  tx();
  return res.json({ message: 'Configurações salvas com sucesso.' });
});

export default router;
