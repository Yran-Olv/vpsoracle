import { Router } from 'express';
import { DomainsService } from '../services/domains.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const results = await DomainsService.checkAllDomains();
    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao verificar domínios', details: err.message });
  }
});

router.post('/', authMiddleware, auditMiddleware('ADD_DOMAIN'), async (req, res) => {
  const { domainName, targetUrl } = req.body;
  if (!domainName) {
    return res.status(400).json({ error: 'Nome do domínio é obrigatório.' });
  }

  try {
    const domain = DomainsService.addDomain(domainName, targetUrl || `https://${domainName}`);
    const check = await DomainsService.checkSingleDomain(domain);
    return res.status(201).json(check);
  } catch (err: any) {
    return res.status(400).json({ error: 'Erro ao cadastrar domínio', details: err.message });
  }
});

router.delete('/:id', authMiddleware, auditMiddleware('DELETE_DOMAIN'), (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const success = DomainsService.deleteDomain(id);
  if (!success) {
    return res.status(404).json({ error: 'Domínio não encontrado.' });
  }
  return res.json({ message: 'Domínio removido com sucesso.' });
});

router.post('/:id/check', authMiddleware, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const domains = DomainsService.getDomains();
  const domain = domains.find(d => d.id === id);
  if (!domain) {
    return res.status(404).json({ error: 'Domínio não encontrado.' });
  }

  const result = await DomainsService.checkSingleDomain(domain);
  return res.json(result);
});

export default router;
