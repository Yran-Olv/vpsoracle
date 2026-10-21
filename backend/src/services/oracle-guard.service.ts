import { db } from '../database';
import { OracleRulesService } from './oracle-rules.service';
import { MetricsService } from './metrics.service';
import { OciService, OciInstanceMetadata } from './oci.service';

export interface ResourceGuardItem {
  id: string;
  name: string;
  category: 'compute' | 'storage' | 'network' | 'policy';
  currentUsage: number;
  limit: number;
  unit: string;
  formattedCurrent: string;
  formattedLimit: string;
  usagePercent: number;
  remainingMargin: string;
  status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO';
  statusColor: 'green' | 'yellow' | 'orange' | 'red';
  statusBadge: string;
  details: string;
  isOfficialRule: boolean;
}

export interface OracleFreeGuardReport {
  overallStatus: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO';
  overallStatusBadge: string;
  overallScore: number;
  instance: OciInstanceMetadata;
  resources: ResourceGuardItem[];
  idleReclamation: {
    status: 'SEGURO' | 'ATENÇÃO' | 'RISCO';
    cpu95thPercentile: number;
    ram95thPercentile: number;
    network95thPercentile: number;
    thresholdPercent: number;
    evaluationWindowDays: number;
    isAtRisk: boolean;
    warningMessage: string | null;
  };
  lastEvaluatedAt: string;
}

export class OracleGuardService {
  static async evaluateGuard(): Promise<OracleFreeGuardReport> {
    const rules = OracleRulesService.getRules();
    const [metrics, instance] = await Promise.all([
      MetricsService.collectMetrics(),
      OciService.getInstanceMetadata()
    ]);

    // Get tenancy official rule limits (Novas Regras Always Free: 2 OCPUs / 12 GB RAM)
    const ocpuRule = rules.find(r => r.ruleKey === 'arm_ocpu_limit')?.numericLimit || 2;
    const ramRuleGb = rules.find(r => r.ruleKey === 'arm_ram_limit')?.numericLimit || 12;
    const storageRuleGb = rules.find(r => r.ruleKey === 'block_and_boot_storage_total')?.numericLimit || 200;
    const bandwidthRuleTb = rules.find(r => r.ruleKey === 'outbound_data_transfer')?.numericLimit || 10;
    const ipv4Rule = rules.find(r => r.ruleKey === 'public_ipv4_ephemeral')?.numericLimit || 2;

    // 1. OCPU Resource
    const allocatedOcpu = instance.ocpus || metrics.cpu.cores || 2;
    const usedOcpu = Math.round((metrics.cpu.usagePercent / 100) * allocatedOcpu * 100) / 100;
    const ocpuTenancyPercent = Math.min(100, Math.round((allocatedOcpu / ocpuRule) * 100));
    const ocpuStatus = this.calculateQuotaAllocationStatus(allocatedOcpu, ocpuRule);

    // 2. RAM Resource
    const allocatedRamGb = instance.memoryInGBs || Math.round((metrics.memory.totalBytes / (1024 * 1024 * 1024)) * 10) / 10 || 12;
    const usedRamGb = Math.round((metrics.memory.usedBytes / (1024 * 1024 * 1024)) * 10) / 10;
    const ramTenancyPercent = Math.min(100, Math.round((allocatedRamGb / ramRuleGb) * 100));
    const ramStatus = this.calculateQuotaAllocationStatus(allocatedRamGb, ramRuleGb);

    // 3. Storage Resource (Disk Total vs 200GB Free Tier limit)
    const usedStorageGb = Math.round((metrics.disk.usedBytes / (1024 * 1024 * 1024)) * 10) / 10;
    const storageTotalAllocatedGb = Math.round((metrics.disk.totalBytes / (1024 * 1024 * 1024)) * 10) / 10;
    const storagePercent = Math.round((usedStorageGb / storageRuleGb) * 1000) / 10;
    const storageStatus = this.calculateStatus(storagePercent, 75, 85, 95);

    // 4. Boot Volume Margin
    const bootVolumePercent = Math.round((metrics.disk.usedBytes / metrics.disk.totalBytes) * 1000) / 10;
    const bootVolumeStatus = this.calculateStatus(bootVolumePercent, 75, 85, 95);

    // 5. Network Egress Transfer
    const monthlyNetTb = Math.round(((metrics.network.totalTxBytes / (1024 * 1024 * 1024 * 1024)) * 1000)) / 1000;
    const netPercent = Math.round((monthlyNetTb / bandwidthRuleTb) * 1000) / 10;
    const netStatus = this.calculateStatus(netPercent, 60, 80, 90);

    // 6. Public IPv4
    const publicIpsCount = 1;
    const ipv4Percent = Math.round((publicIpsCount / ipv4Rule) * 100);
    const ipv4Status = this.calculateStatus(ipv4Percent, 70, 90, 100);

    const resources: ResourceGuardItem[] = [
      {
        id: 'ocpu',
        name: 'CPU / OCPU (VM.Standard.A1.Flex)',
        category: 'compute',
        currentUsage: allocatedOcpu,
        limit: ocpuRule,
        unit: 'OCPUs',
        formattedCurrent: `${allocatedOcpu} OCPUs alocadas (${usedOcpu} OCPU em uso)`,
        formattedLimit: `${ocpuRule} OCPUs Always Free (Tenancy)`,
        usagePercent: ocpuTenancyPercent,
        remainingMargin: `${ocpuRule - allocatedOcpu} OCPUs livres na tenancy`,
        status: ocpuStatus.status,
        statusColor: ocpuStatus.color,
        statusBadge: ocpuStatus.badge,
        details: `Instância ${instance.displayName} aloca ${allocatedOcpu} OCPUs. Limite total gratuito da Tenancy OCI é de ${ocpuRule} OCPUs (1.500 horas/mês - Novas Regras).`,
        isOfficialRule: true
      },
      {
        id: 'ram',
        name: 'Memória RAM (Ampere A1)',
        category: 'compute',
        currentUsage: allocatedRamGb,
        limit: ramRuleGb,
        unit: 'GB',
        formattedCurrent: `${usedRamGb} GB em uso (${allocatedRamGb} GB alocados)`,
        formattedLimit: `${ramRuleGb} GB Always Free (Tenancy)`,
        usagePercent: ramTenancyPercent,
        remainingMargin: `${Math.max(0, ramRuleGb - allocatedRamGb)} GB livres na tenancy`,
        status: ramStatus.status,
        statusColor: ramStatus.color,
        statusBadge: ramStatus.badge,
        details: `Instância ${instance.displayName} aloca ${allocatedRamGb} GB de RAM. Limite total gratuito da Tenancy OCI é de ${ramRuleGb} GB (9.000 GB-horas/mês - Novas Regras).`,
        isOfficialRule: true
      },
      {
        id: 'storage',
        name: 'Armazenamento Total (Block + Boot)',
        category: 'storage',
        currentUsage: usedStorageGb,
        limit: storageRuleGb,
        unit: 'GB',
        formattedCurrent: `${usedStorageGb} GB utilizados`,
        formattedLimit: `${storageRuleGb} GB Always Free`,
        usagePercent: storagePercent,
        remainingMargin: `${Math.round((storageRuleGb - usedStorageGb) * 10) / 10} GB disponíveis no Free Tier`,
        status: storageStatus.status,
        statusColor: storageStatus.color,
        statusBadge: storageStatus.badge,
        details: `Limite oficial Oracle: 200 GB no total entre Boot Volumes e Block Volumes. O disco desta VM tem ${storageTotalAllocatedGb} GB.`,
        isOfficialRule: true
      },
      {
        id: 'boot_volume',
        name: 'Volume de Inicialização (Boot Volume)',
        category: 'storage',
        currentUsage: usedStorageGb,
        limit: storageTotalAllocatedGb,
        unit: 'GB',
        formattedCurrent: `${usedStorageGb} GB ocupados`,
        formattedLimit: `${storageTotalAllocatedGb} GB capacidade`,
        usagePercent: bootVolumePercent,
        remainingMargin: `${Math.round((storageTotalAllocatedGb - usedStorageGb) * 10) / 10} GB livres no disco local`,
        status: bootVolumeStatus.status,
        statusColor: bootVolumeStatus.color,
        statusBadge: bootVolumeStatus.badge,
        details: 'Volume raiz particionado em ext4.',
        isOfficialRule: true
      },
      {
        id: 'network',
        name: 'Tráfego de Saída (Egress Transfer)',
        category: 'network',
        currentUsage: monthlyNetTb,
        limit: bandwidthRuleTb,
        unit: 'TB/mês',
        formattedCurrent: `${monthlyNetTb} TB consumidos este mês`,
        formattedLimit: `${bandwidthRuleTb} TB / mês Always Free`,
        usagePercent: netPercent,
        remainingMargin: `${Math.round((bandwidthRuleTb - monthlyNetTb) * 100) / 100} TB restantes`,
        status: netStatus.status,
        statusColor: netStatus.color,
        statusBadge: netStatus.badge,
        details: 'Limite oficial Oracle: 10 TB/mês de egress de dados para internet grátis.',
        isOfficialRule: true
      },
      {
        id: 'public_ip',
        name: 'Endereço IPv4 Público',
        category: 'network',
        currentUsage: publicIpsCount,
        limit: ipv4Rule,
        unit: 'IPs',
        formattedCurrent: `${publicIpsCount} IP Público (${instance.publicIp})`,
        formattedLimit: `${ipv4Rule} IPs Públicos Always Free`,
        usagePercent: ipv4Percent,
        remainingMargin: `${ipv4Rule - publicIpsCount} IP público disponível`,
        status: ipv4Status.status,
        statusColor: ipv4Status.color,
        statusBadge: ipv4Status.badge,
        details: '1 IP público efêmero/reservado gratuito por instância ativa.',
        isOfficialRule: true
      }
    ];

    // 7. Idle Instance Reclamation Evaluation
    const history = MetricsService.getHistory('7d');
    let cpu95 = metrics.cpu.usagePercent;
    let ram95 = metrics.memory.usagePercent;
    let net95 = 5;

    if (history.length > 5) {
      const sortedCpu = [...history.map(h => h.cpu)].sort((a, b) => a - b);
      const sortedMem = [...history.map(h => h.memory)].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedCpu.length * 0.95);
      cpu95 = sortedCpu[p95Index] || metrics.cpu.usagePercent;
      ram95 = sortedMem[p95Index] || metrics.memory.usagePercent;
    }

    const isIdleAtRisk = (cpu95 < 20 && ram95 < 20);
    let idleStatus: 'SEGURO' | 'ATENÇÃO' | 'RISCO' = 'SEGURO';
    let idleWarning: string | null = null;

    if (isIdleAtRisk) {
      idleStatus = 'ATENÇÃO';
      idleWarning = 'Atenção: A Oracle possui uma regra oficial que pode desligar ou reclamar instâncias Always Free se o percentil 95 de CPU, RAM e Rede permanecer abaixo de 20% durante 7 dias. Seu uso de RAM/CPU está baixo. Mantenha seus serviços/containers rodando.';
    }

    // Calculate Overall Status
    let overallStatus: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO' = 'SEGURO';
    let overallBadge = '🟢 SEGURO';
    let overallScore = 100;

    const criticalItems = resources.filter(r => r.status === 'CRÍTICO');
    const riskItems = resources.filter(r => r.status === 'RISCO');
    const warningItems = resources.filter(r => r.status === 'ATENÇÃO');

    if (criticalItems.length > 0) {
      overallStatus = 'CRÍTICO';
      overallBadge = '🔴 CRÍTICO';
      overallScore = 25;
    } else if (riskItems.length > 0) {
      overallStatus = 'RISCO';
      overallBadge = '🟠 RISCO';
      overallScore = 55;
    } else if (warningItems.length > 0 || isIdleAtRisk) {
      overallStatus = 'ATENÇÃO';
      overallBadge = '🟡 ATENÇÃO';
      overallScore = 78;
    }

    return {
      overallStatus,
      overallStatusBadge: overallBadge,
      overallScore,
      instance,
      resources,
      idleReclamation: {
        status: idleStatus,
        cpu95thPercentile: Math.round(cpu95 * 10) / 10,
        ram95thPercentile: Math.round(ram95 * 10) / 10,
        network95thPercentile: net95,
        thresholdPercent: 20,
        evaluationWindowDays: 7,
        isAtRisk: isIdleAtRisk,
        warningMessage: idleWarning
      },
      lastEvaluatedAt: new Date().toISOString()
    };
  }

  private static calculateStatus(
    percent: number,
    warnThreshold: number,
    riskThreshold: number,
    critThreshold: number
  ): { status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO'; color: 'green' | 'yellow' | 'orange' | 'red'; badge: string } {
    if (percent >= critThreshold) {
      return { status: 'CRÍTICO', color: 'red', badge: '🔴 CRÍTICO' };
    }
    if (percent >= riskThreshold) {
      return { status: 'RISCO', color: 'orange', badge: '🟠 RISCO' };
    }
    if (percent >= warnThreshold) {
      return { status: 'ATENÇÃO', color: 'yellow', badge: '🟡 ATENÇÃO' };
    }
    return { status: 'SEGURO', color: 'green', badge: '🟢 SEGURO' };
  }

  private static calculateQuotaAllocationStatus(
    allocated: number,
    limit: number
  ): { status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO'; color: 'green' | 'yellow' | 'orange' | 'red'; badge: string } {
    if (allocated > limit) {
      return { status: 'CRÍTICO', color: 'red', badge: '🔴 EXCEDIDO' };
    }
    return { status: 'SEGURO', color: 'green', badge: '🟢 SEGURO' };
  }
}
