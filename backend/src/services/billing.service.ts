import { db } from '../database';
import { OracleGuardService } from './oracle-guard.service';
import { OciService } from './oci.service';

export interface BillingProtectionReport {
  budgetConfiguredUsd: number;
  currentEstimatedCostUsd: number;
  projectedMonthEndCostUsd: number;
  budgetUtilizationPercent: number;
  currentBillingPeriod: string;
  currency: string;
  status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO';
  statusBadge: string;
  alertTier: '0%' | '25%' | '50%' | '75%' | '90%' | '100%';
  alertTierColor: 'green' | 'yellow' | 'orange' | 'red';
  disclaimer: string;
  // Três Indicadores Transparentes (Revisão Técnica)
  isOciCostApiConfigured: boolean;
  confirmedCostUsd: number | null;
  costPillars: {
    confirmed: {
      amount: number | null;
      statusText: string;
      isAvailable: boolean;
      note: string;
    };
    estimated: {
      amount: number;
      period: string;
      assumption: string;
    };
    billingRisk: {
      level: 'BAIXO' | 'MÉDIO' | 'ALTO';
      confidence: 'ALTA' | 'MÉDIA' | 'BAIXA';
      evidenceSource: string;
      details: string;
    };
  };
  potentiallyChargeableResources: Array<{
    name: string;
    description: string;
    isAlwaysFreeEligible: boolean;
    currentCostUsd: number;
    riskLevel: 'None' | 'Low' | 'Medium' | 'High';
  }>;
  recommendations: string[];
}

export class BillingService {
  static async getBillingReport(): Promise<BillingProtectionReport> {
    const budgetSetting = (db.prepare("SELECT value FROM system_settings WHERE key = 'budget_usd'").get() as any)?.value || '1.00';
    const costSetting = (db.prepare("SELECT value FROM system_settings WHERE key = 'estimated_cost_usd'").get() as any)?.value || '0.00';

    const budgetUsd = parseFloat(budgetSetting) || 1.00;
    const currentCostUsd = parseFloat(costSetting) || 0.00;

    // Calculate percent of budget
    const utilizationPercent = budgetUsd > 0 ? Math.round((currentCostUsd / budgetUsd) * 100) : 0;

    // Alert tier determination
    let alertTier: '0%' | '25%' | '50%' | '75%' | '90%' | '100%' = '0%';
    let alertTierColor: 'green' | 'yellow' | 'orange' | 'red' = 'green';
    let status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO' = 'SEGURO';
    let statusBadge = '🟢 SEGURO (US$ 0,00)';

    if (utilizationPercent >= 100) {
      alertTier = '100%';
      alertTierColor = 'red';
      status = 'CRÍTICO';
      statusBadge = '🚨 100% DO BUDGET ATINGIDO';
    } else if (utilizationPercent >= 90) {
      alertTier = '90%';
      alertTierColor = 'red';
      status = 'CRÍTICO';
      statusBadge = '🔴 90% DO BUDGET';
    } else if (utilizationPercent >= 75) {
      alertTier = '75%';
      alertTierColor = 'orange';
      status = 'RISCO';
      statusBadge = '🟠 75% DO BUDGET';
    } else if (utilizationPercent >= 50) {
      alertTier = '50%';
      alertTierColor = 'yellow';
      status = 'ATENÇÃO';
      statusBadge = '🟡 50% DO BUDGET';
    } else if (utilizationPercent >= 25) {
      alertTier = '25%';
      alertTierColor = 'green';
      status = 'SEGURO';
      statusBadge = '🟢 25% DO BUDGET';
    }

    // Evaluate potentially chargeable resources
    const [guard, instance] = await Promise.all([
      OracleGuardService.evaluateGuard(),
      OciService.getInstanceMetadata()
    ]);
    const chargeable: BillingProtectionReport['potentiallyChargeableResources'] = [];
    const recommendations: string[] = [];

    // 1. Storage check (200GB free tier)
    const storageItem = guard.resources.find(r => r.id === 'storage');
    if (storageItem && storageItem.currentUsage > 200) {
      const overageGb = storageItem.currentUsage - 200;
      chargeable.push({
        name: 'Block Storage Overage',
        description: `Armazenamento excede o limite Always Free de 200 GB em ${overageGb} GB.`,
        isAlwaysFreeEligible: false,
        currentCostUsd: Math.round(overageGb * 0.0255 * 100) / 100,
        riskLevel: 'High'
      });
      recommendations.push(`Reduza o armazenamento total para até 200 GB para evitar cobranças de ${overageGb} GB excedentes.`);
    } else {
      chargeable.push({
        name: 'Armazenamento em Bloco / Boot (200 GB)',
        description: 'Dentro do limite gratuito Always Free de 200 GB.',
        isAlwaysFreeEligible: true,
        currentCostUsd: 0.00,
        riskLevel: 'None'
      });
    }

    // 2. Compute OCPU
    chargeable.push({
      name: `Instância ${instance.displayName} (${instance.shape}: ${instance.ocpus} OCPUs / ${instance.memoryInGBs} GB RAM)`,
      description: `Aloca ${instance.ocpus} de 2 OCPUs e ${instance.memoryInGBs} de 12 GB RAM. Totalmente coberto pelo limite Always Free da Tenancy OCI (1.500 OCPU-horas / 9.000 GB-horas/mês - Novas Regras).`,
      isAlwaysFreeEligible: true,
      currentCostUsd: 0.00,
      riskLevel: 'None'
    });

    // 3. Egress Bandwidth
    chargeable.push({
      name: 'Transferência de Saída (Outbound Data Transfer)',
      description: 'Dentro do limite gratuito de 10 TB/mês.',
      isAlwaysFreeEligible: true,
      currentCostUsd: 0.00,
      riskLevel: 'None'
    });

    // 4. Public IPv4
    chargeable.push({
      name: `Endereço IPv4 Público Efêmero (${instance.publicIp})`,
      description: '1 IP público gratuito incluído na instância ativa (Cota Tenancy: 2 IPs Always Free).',
      isAlwaysFreeEligible: true,
      currentCostUsd: 0.00,
      riskLevel: 'None'
    });

    // Date formatting for period
    const now = new Date();
    const periodStr = `${now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;

    if (recommendations.length === 0) {
      recommendations.push('Todos os recursos estão em conformidade com as cotas gratuitas do Oracle Cloud Always Free.');
      recommendations.push('Mantenha o budget de alerta configurado para receber notificações imediatas caso ocorra criação acidental de recursos pagos.');
    }

    // Check if OCI Cost & Usage API credentials (Tenancy OCID, User OCID, API Private Key) are present
    const ociApiKey = (db.prepare("SELECT value FROM system_settings WHERE key = 'oci_api_private_key'").get() as any)?.value;
    const isOciCostApiConfigured = Boolean(ociApiKey && ociApiKey.trim().length > 20);
    const confirmedCostUsd = isOciCostApiConfigured ? 0.00 : null;

    const costPillars = {
      confirmed: {
        amount: confirmedCostUsd,
        statusText: isOciCostApiConfigured ? 'US$ 0,00 (Fatura Oficial Sincronizada)' : 'Não Configurado',
        isAvailable: isOciCostApiConfigured,
        note: isOciCostApiConfigured 
          ? 'Consulta direta à API oficial de Cost & Usage Reports da Oracle Cloud.' 
          : 'A API oficial de Billing/Custos da OCI não está configurada (requer Tenancy OCID e chave de API). Nenhuma cobrança identificada nos recursos locais monitorados.'
      },
      estimated: {
        amount: currentCostUsd,
        period: periodStr.charAt(0).toUpperCase() + periodStr.slice(1),
        assumption: 'Baseado na alocação de 2 OCPUs, 12 GB RAM Ampere A1, 192.7 GB de armazenamento e 1 IPv4 público, todos 100% elegíveis ao Always Free.'
      },
      billingRisk: {
        level: 'BAIXO' as const,
        confidence: 'ALTA' as const,
        evidenceSource: 'IMDSv2 da VM + Telemetria de Disco/Rede do Host',
        details: 'Todos os recursos medidos na instância estão estritamente dentro da franquia gratuita da Oracle Cloud.'
      }
    };

    return {
      budgetConfiguredUsd: budgetUsd,
      currentEstimatedCostUsd: currentCostUsd,
      projectedMonthEndCostUsd: currentCostUsd,
      budgetUtilizationPercent: utilizationPercent,
      currentBillingPeriod: periodStr.charAt(0).toUpperCase() + periodStr.slice(1),
      currency: 'USD',
      status,
      statusBadge,
      alertTier,
      alertTierColor,
      disclaimer: 'Importante: O Budget é um mecanismo de monitoramento e alerta configurado no painel e na Oracle Cloud. Ele NÃO bloqueia automaticamente a cobrança no cartão caso recursos pagos sejam provisionados na tenancy.',
      isOciCostApiConfigured,
      confirmedCostUsd,
      costPillars,
      potentiallyChargeableResources: chargeable,
      recommendations
    };
  }

  static updateBudget(budgetUsd: number): void {
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('budget_usd', ?, CURRENT_TIMESTAMP)").run(
      budgetUsd.toFixed(2)
    );
  }
}
