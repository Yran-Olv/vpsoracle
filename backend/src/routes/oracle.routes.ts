import { Router } from 'express';
import { OracleGuardService } from '../services/oracle-guard.service';
import { OracleRulesService } from '../services/oracle-rules.service';
import { OracleChangeService } from '../services/oracle-change.service';
import { BillingService } from '../services/billing.service';
import { OciService } from '../services/oci.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();

import { ServersService } from '../services/servers.service';

// Oracle Instance Real Metadata (IMDS v2)
router.get('/instance', authMiddleware, async (req, res) => {
  try {
    const serverId = parseInt(req.query.serverId as string || '1', 10);
    const server = ServersService.getServerById(serverId);
    if (server && server.provider !== 'oracle') {
      return res.status(400).json({ error: `O servidor #${serverId} (${server.name}) é do provedor "${server.provider}". O IMDS só está disponível em instâncias Oracle Cloud.` });
    }

    const metadata = await OciService.getInstanceMetadata();
    return res.json(metadata);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter metadados da instância OCI', details: err.message });
  }
});

// Oracle Free Guard
router.get('/free-tier', authMiddleware, async (req, res) => {
  try {
    const serverId = parseInt(req.query.serverId as string || '1', 10);
    const server = ServersService.getServerById(serverId);

    if (server && server.provider !== 'oracle') {
      return res.json({
        isEligible: false,
        overallStatus: 'SEGURO',
        overallStatusBadge: '⚪ Provedor Não-Oracle',
        overallScore: 100,
        resources: [],
        message: `Este servidor (${server.name}) é do tipo "${server.provider}". As cotas e limites Always Free do Oracle Free Guard aplicam-se exclusivamente a instâncias Oracle Cloud.`,
        lastEvaluatedAt: new Date().toISOString()
      });
    }

    const report = await OracleGuardService.evaluateGuard();
    return res.json({ ...report, isEligible: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao avaliar Oracle Free Guard', details: err.message });
  }
});

// Oracle Rules
router.get('/rules', authMiddleware, (req, res) => {
  try {
    const rules = OracleRulesService.getRules();
    return res.json(rules);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter regras Oracle', details: err.message });
  }
});

router.post('/rules/refresh', authMiddleware, auditMiddleware('REFRESH_ORACLE_RULES'), async (req, res) => {
  try {
    const result = await OracleRulesService.refreshRulesFromOracle();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar regras Oracle', details: err.message });
  }
});

// Oracle Rule Changes History
router.get('/changes', authMiddleware, (req, res) => {
  try {
    const changes = OracleChangeService.getChanges();
    return res.json(changes);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter histórico de alterações', details: err.message });
  }
});

// Billing Protection & Cost
router.get('/billing', authMiddleware, async (req, res) => {
  try {
    const report = await BillingService.getBillingReport();
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao obter relatório de billing', details: err.message });
  }
});

router.post('/billing/budget', authMiddleware, auditMiddleware('UPDATE_BUDGET'), (req, res) => {
  const { budgetUsd } = req.body;
  if (typeof budgetUsd !== 'number' || budgetUsd < 0) {
    return res.status(400).json({ error: 'Valor de budget inválido.' });
  }

  BillingService.updateBudget(budgetUsd);
  return res.json({ message: 'Budget atualizado com sucesso.', budgetUsd });
});

export default router;
