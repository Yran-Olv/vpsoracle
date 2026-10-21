import { MetricsService } from './metrics.service';
import { OracleGuardService } from './oracle-guard.service';
import { DockerService } from './docker.service';
import { ServicesService } from './services.service';
import { DomainsService } from './domains.service';
import { BillingService } from './billing.service';

export interface RiskFactor {
  id: string;
  category: 'storage' | 'compute' | 'docker' | 'services' | 'ssl' | 'billing' | 'idle_policy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  whatHappened: string;
  whyItMatters: string;
  whatToDo: string;
  scoreContribution: number; // 0-30 points added to risk
}

export interface FreeTierRiskReport {
  score: number; // 0 to 100
  status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO';
  statusBadge: string;
  statusColor: 'green' | 'yellow' | 'orange' | 'red';
  summary: string;
  riskFactors: RiskFactor[];
  evaluatedAt: string;
}

export class RiskEngineService {
  static async evaluateRisk(): Promise<FreeTierRiskReport> {
    const [metrics, guard, docker, services, domains, billing] = await Promise.all([
      MetricsService.collectMetrics(),
      OracleGuardService.evaluateGuard(),
      DockerService.getContainers(),
      ServicesService.getServicesStatus(),
      DomainsService.checkAllDomains().catch(() => []),
      BillingService.getBillingReport()
    ]);

    let riskScore = 0;
    const riskFactors: RiskFactor[] = [];

    // 1. Storage & Free Tier Disk limit check (200GB)
    const storageItem = guard.resources.find(r => r.id === 'storage');
    if (storageItem) {
      if (storageItem.usagePercent >= 90) {
        riskScore += 35;
        riskFactors.push({
          id: 'storage_critical',
          category: 'storage',
          severity: 'critical',
          title: 'Armazenamento Crítico próximo ao limite do Free Tier',
          whatHappened: `O disco está em ${storageItem.usagePercent}% (${storageItem.currentUsage} GB de 200 GB Always Free).`,
          whyItMatters: 'Se o armazenamento ultrapassar 200 GB na tenancy ou 100% no disco da VM, o sistema sofrerá travamentos e a Oracle começará a faturar blocos excedentes.',
          whatToDo: 'Execute limpeza de logs antigos, remova imagens Docker não utilizadas (docker system prune) ou aumente a partição após verificar o impacto.',
          scoreContribution: 35
        });
      } else if (storageItem.usagePercent >= 75) {
        riskScore += 18;
        riskFactors.push({
          id: 'storage_warning',
          category: 'storage',
          severity: 'medium',
          title: 'Armazenamento requer atenção',
          whatHappened: `O armazenamento atingiu ${storageItem.usagePercent}% de ocupação.`,
          whyItMatters: 'O crescimento contínuo de logs e bancos de dados pode atingir o limite nas próximas semanas.',
          whatToDo: 'Monitore o crescimento semanal e configure rotação de backups e logs.',
          scoreContribution: 18
        });
      }
    }

    // 2. Idle Instance Reclamation Policy
    if (guard.idleReclamation.isAtRisk) {
      riskScore += 15;
      riskFactors.push({
        id: 'idle_reclamation',
        category: 'idle_policy',
        severity: 'medium',
        title: 'Risco de Reclamação por Ociosidade (Oracle Idle Policy)',
        whatHappened: 'A utilização de CPU e RAM no percentil 95 está abaixo do limiar de 20% estabelecido pela política da Oracle.',
        whyItMatters: 'A Oracle Cloud desliga ou recupera instâncias Always Free se CPU, RAM e Rede permanecerem abaixo de 20% durante 7 dias seguidos.',
        whatToDo: 'Mantenha suas aplicações, bancos de dados e tarefas programadas ativas na VPS para garantir atividade legítima.',
        scoreContribution: 15
      });
    }

    // 3. Docker Containers Status
    if (docker.unhealthy > 0) {
      riskScore += 25;
      riskFactors.push({
        id: 'docker_unhealthy',
        category: 'docker',
        severity: 'high',
        title: `${docker.unhealthy} container(s) Docker com falha de Healthcheck`,
        whatHappened: 'Um ou mais containers estão marcados como UNHEALTHY pelo Docker.',
        whyItMatters: 'Serviços em containers com falha podem parar de responder aos usuários finais.',
        whatToDo: 'Acesse a aba Docker no painel, visualize os logs do container afetado e reinicie o serviço.',
        scoreContribution: 25
      });
    }

    // 4. Critical Services Down
    const downServices = services.filter(s => s.status === 'down' && (s.name === 'nginx' || s.name === 'postgresql' || s.name === 'docker'));
    if (downServices.length > 0) {
      const names = downServices.map(s => s.label).join(', ');
      riskScore += 30;
      riskFactors.push({
        id: 'services_down',
        category: 'services',
        severity: 'critical',
        title: `Serviço essencial inoperante: ${names}`,
        whatHappened: `O serviço ${names} foi detectado como parado (Down).`,
        whyItMatters: 'A indisponibilidade de serviços centrais como Nginx ou Banco de Dados interrompe as rotas públicas da VPS.',
        whatToDo: 'Verifique o status do systemd via console ou reinicie o serviço correspondente.',
        scoreContribution: 30
      });
    }

    // 5. SSL Expiration Warnings
    const expiringDomains = domains.filter(d => d.ssl.daysRemaining !== null && d.ssl.daysRemaining <= 15);
    for (const d of expiringDomains) {
      const days = d.ssl.daysRemaining;
      const isCrit = days !== null && days <= 5;
      const contrib = isCrit ? 25 : 12;
      riskScore += contrib;
      riskFactors.push({
        id: `ssl_expiring_${d.id}`,
        category: 'ssl',
        severity: isCrit ? 'critical' : 'medium',
        title: `Certificado SSL de ${d.domainName} expira em ${days} dias`,
        whatHappened: `O certificado Let's Encrypt / SSL expira em breve.`,
        whyItMatters: 'Certificados vencidos causam bloqueio de segurança em todos os navegadores com aviso de site não confiável.',
        whatToDo: 'Execute a renovação via Certbot (sudo certbot renew) ou verifique o proxy SSL no Nginx/Cloudflare.',
        scoreContribution: contrib
      });
    }

    // 6. Billing Budget Tier
    if (billing.budgetUtilizationPercent >= 90) {
      riskScore += 25;
      riskFactors.push({
        id: 'budget_high',
        category: 'billing',
        severity: 'high',
        title: 'Utilização do Budget de Alerta atingiu 90%+',
        whatHappened: `O consumo estimado atingiu ${billing.budgetUtilizationPercent}% do valor configurado (US$ ${billing.budgetConfiguredUsd}).`,
        whyItMatters: 'Sinaliza possível provisionamento de recurso não coberto pelo Always Free.',
        whatToDo: 'Revise o painel da Oracle Cloud Infrastructure e certifique-se de que nenhum volume ou IP extra pago foi criado.',
        scoreContribution: 25
      });
    }

    // Clamp score to 0-100
    riskScore = Math.min(100, Math.max(0, riskScore));

    let status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO' = 'SEGURO';
    let statusBadge = '🟢 SEGURO';
    let statusColor: 'green' | 'yellow' | 'orange' | 'red' = 'green';
    let summary = 'Sua VPS está operando com estabilidade e todos os recursos estão totalmente protegidos dentro do Oracle Cloud Always Free.';

    if (riskScore >= 81) {
      status = 'CRÍTICO';
      statusBadge = '🔴 CRÍTICO';
      statusColor = 'red';
      summary = 'Atenção imediata requerida: foram detectados problemas críticos que podem afetar a disponibilidade ou gerar custos.';
    } else if (riskScore >= 61) {
      status = 'RISCO';
      statusBadge = '🟠 RISCO';
      statusColor = 'orange';
      summary = 'Existem fatores de risco moderados a altos. Recomenda-se executar as ações indicadas abaixo.';
    } else if (riskScore >= 31) {
      status = 'ATENÇÃO';
      statusBadge = '🟡 ATENÇÃO';
      statusColor = 'yellow';
      summary = 'A VPS está saudável, mas alguns itens requerem acompanhamento preventivo.';
    }

    return {
      score: riskScore,
      status,
      statusBadge,
      statusColor,
      summary,
      riskFactors,
      evaluatedAt: new Date().toISOString()
    };
  }
}
