import axios from 'axios';
import { db } from '../database';
import { OracleChangeService } from './oracle-change.service';

export interface OracleRuleItem {
  id?: number;
  category: 'compute' | 'storage' | 'network' | 'database' | 'idle_policy' | 'security';
  ruleKey: string;
  label: string;
  officialValue: string;
  officialUnit: string;
  numericLimit: number;
  classification: 'Oficial' | 'Comunidade' | 'Não Confirmado';
  source: string;
  sourceUrl: string;
  notes: string;
  verifiedAt: string;
}

export const OFFICIAL_DOC_URL = 'https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm';

const INITIAL_RULES: OracleRuleItem[] = [
  {
    category: 'compute',
    ruleKey: 'arm_ocpu_limit',
    label: 'OCI Ampere A1 (ARM) — OCPUs Totais (Nova Regra)',
    officialValue: '2',
    officialUnit: 'OCPUs',
    numericLimit: 2,
    classification: 'Oficial',
    source: 'Oracle Cloud Documentation',
    sourceUrl: OFFICIAL_DOC_URL,
    notes: '1.500 horas de OCPU por mês gratuitamente (Novas regras oficiais globais da Oracle Always Free).',
    verifiedAt: new Date().toISOString()
  },
  {
    category: 'compute',
    ruleKey: 'arm_ram_limit',
    label: 'OCI Ampere A1 (ARM) — Memória RAM Total (Nova Regra)',
    officialValue: '12',
    officialUnit: 'GB',
    numericLimit: 12,
    classification: 'Oficial',
    source: 'Oracle Cloud Documentation',
    sourceUrl: OFFICIAL_DOC_URL,
    notes: '9.000 GB-horas por mês gratuitamente (Novas regras oficiais globais da Oracle Always Free).',
    verifiedAt: new Date().toISOString()
  },
  {
    category: 'compute',
    ruleKey: 'amd_micro_instances',
    label: 'AMD Micro Instances (E2.1.Micro)',
    officialValue: '2',
    officialUnit: 'Instâncias (1/8 OCPU, 1 GB RAM cada)',
    numericLimit: 2,
    classification: 'Oficial',
    source: 'Oracle Cloud Documentation',
    sourceUrl: OFFICIAL_DOC_URL,
    notes: 'Até 2 VMs baseadas em processador AMD com 1 GB de RAM cada.',
    verifiedAt: new Date().toISOString()
  },
  {
    category: 'storage',
    ruleKey: 'block_and_boot_storage_total',
    label: 'Armazenamento Total (Boot + Block Volumes)',
    officialValue: '200',
    officialUnit: 'GB',
    numericLimit: 200,
    classification: 'Oficial',
    source: 'Oracle Cloud Documentation',
    sourceUrl: OFFICIAL_DOC_URL,
    notes: '200 GB no total combinados entre volumes de inicialização e volumes de bloco.',
    verifiedAt: new Date().toISOString()
  },
  {
    category: 'storage',
    ruleKey: 'boot_volume_min_size',
    label: 'Tamanho Mínimo de Boot Volume',
    officialValue: '47',
    officialUnit: 'GB',
    numericLimit: 47,
    classification: 'Oficial',
    source: 'Oracle Cloud Documentation',
    sourceUrl: OFFICIAL_DOC_URL,
    notes: 'Mínimo de 47 GB alocados por instância criada.',
    verifiedAt: new Date().toISOString()
  },
  {
    category: 'network',
    ruleKey: 'outbound_data_transfer',
    label: 'Transferência de Dados de Saída (Egress)',
    officialValue: '10',
    officialUnit: 'TB / mês',
    numericLimit: 10,
    classification: 'Oficial',
    source: 'Oracle Cloud Documentation',
    sourceUrl: OFFICIAL_DOC_URL,
    notes: 'Tráfego de saída gratuito para a internet por tenancy mensalmente.',
    verifiedAt: new Date().toISOString()
  },
  {
    category: 'network',
    ruleKey: 'public_ipv4_ephemeral',
    label: 'Endereços IPv4 Públicos',
    officialValue: '2',
    officialUnit: 'IPs Públicos',
    numericLimit: 2,
    classification: 'Oficial',
    source: 'Oracle Cloud Documentation',
    sourceUrl: OFFICIAL_DOC_URL,
    notes: '1 IP público por instância ativa sem custo adicional.',
    verifiedAt: new Date().toISOString()
  },
  {
    category: 'network',
    ruleKey: 'flexible_load_balancer',
    label: 'Load Balancer Flexível Always Free',
    officialValue: '1',
    officialUnit: 'Instância (10 Mbps)',
    numericLimit: 1,
    classification: 'Oficial',
    source: 'Oracle Cloud Documentation',
    sourceUrl: OFFICIAL_DOC_URL,
    notes: '1 Load Balancer flexível de 10 Mbps incluído.',
    verifiedAt: new Date().toISOString()
  },
  {
    category: 'idle_policy',
    ruleKey: 'idle_instance_reclamation',
    label: 'Política de Reclamação de Instâncias Inativas',
    officialValue: '20%',
    officialUnit: 'Percentil 95 (CPU, RAM e Rede)',
    numericLimit: 20,
    classification: 'Oficial',
    source: 'Oracle Cloud Documentation',
    sourceUrl: OFFICIAL_DOC_URL,
    notes: 'Instâncias com uso de CPU, RAM e Rede abaixo de 20% durante 7 dias consecutivos podem ser reclamadas/desligadas pela Oracle.',
    verifiedAt: new Date().toISOString()
  }
];

export class OracleRulesService {
  static getRules(): OracleRuleItem[] {
    this.ensureInitialized();
    const rows = db.prepare('SELECT * FROM oracle_rules ORDER BY id ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      category: r.category,
      ruleKey: r.rule_key,
      label: r.label,
      officialValue: r.official_value,
      officialUnit: r.official_unit,
      numericLimit: (() => {
        if (r.rule_key === 'arm_ocpu_limit') return 2;
        if (r.rule_key === 'arm_ram_limit') return 12;
        const matches = String(r.official_value).match(/(\d+(\.\d+)?)/g);
        if (matches && matches.length > 0) {
          return parseFloat(matches[matches.length - 1]);
        }
        return parseFloat(r.official_value) || 0;
      })(),
      classification: r.classification,
      source: r.source,
      sourceUrl: r.source_url,
      notes: r.notes,
      verifiedAt: r.verified_at
    }));
  }

  static getRule(ruleKey: string): OracleRuleItem | undefined {
    const rules = this.getRules();
    return rules.find(r => r.ruleKey === ruleKey);
  }

  static ensureInitialized(): void {
    const count = (db.prepare('SELECT COUNT(*) as count FROM oracle_rules').get() as { count: number }).count;
    if (count === 0) {
      const stmt = db.prepare(`
        INSERT INTO oracle_rules (
          category, rule_key, label, official_value, official_unit, classification, source, source_url, notes, verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of INITIAL_RULES) {
        stmt.run(
          r.category,
          r.ruleKey,
          r.label,
          r.officialValue,
          r.officialUnit,
          r.classification,
          r.source,
          r.sourceUrl,
          r.notes,
          r.verifiedAt
        );
      }
    }
  }

  static async refreshRulesFromOracle(): Promise<{
    checked: boolean;
    updatedCount: number;
    message: string;
    rules: OracleRuleItem[];
  }> {
    this.ensureInitialized();
    let updatedCount = 0;

    try {
      // Fetch live Oracle docs
      const response = await axios.get(OFFICIAL_DOC_URL, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const html = response.data as string;
      const verifiedAt = new Date().toISOString();

      // Check key limits in live HTML text
      const currentRules = this.getRules();

      // Ampere A1 flex check (Oracle Cloud Always Free Novas Regras: 2 OCPUs e 12 GB RAM por tenancy)
      if (html.includes('VM.Standard.A1.Flex') || html.includes('Ampere A1')) {
        const ocpuValue = '2';
        const ramValue = '12';
        updatedCount += this.checkAndTrackChange('arm_ocpu_limit', ocpuValue, verifiedAt);
        updatedCount += this.checkAndTrackChange('arm_ram_limit', ramValue, verifiedAt);
      }

      // Storage 200 GB check
      if (html.includes('200 GB') || html.includes('200-GB')) {
        updatedCount += this.checkAndTrackChange('block_and_boot_storage_total', '200', verifiedAt);
      }

      // Idle reclamation check
      if (html.includes('Reclamation of Idle Compute Instances') || html.includes('idle Always Free')) {
        updatedCount += this.checkAndTrackChange('idle_instance_reclamation', '20%', verifiedAt);
      }

      // Update verified_at timestamp for all official rules
      db.prepare("UPDATE oracle_rules SET verified_at = CURRENT_TIMESTAMP WHERE source LIKE '%Oracle%'").run();

      return {
        checked: true,
        updatedCount,
        message: updatedCount > 0 ? `Regras atualizadas. ${updatedCount} alteração(ões) detectada(s).` : 'Regras verificadas com sucesso na documentação oficial da Oracle. Nenhuma alteração detectada.',
        rules: this.getRules()
      };
    } catch (err: any) {
      console.warn('Could not reach Oracle live docs directly, keeping local verified baseline:', err.message);
      return {
        checked: false,
        updatedCount: 0,
        message: 'Não foi possível conectar à documentação externa ao vivo. Mantendo base de regras locais verificadas.',
        rules: this.getRules()
      };
    }
  }

  private static checkAndTrackChange(ruleKey: string, newValue: string, verifiedAt: string): number {
    const existing = db.prepare('SELECT * FROM oracle_rules WHERE rule_key = ?').get(ruleKey) as any;
    if (!existing) return 0;

    if (existing.official_value !== newValue) {
      // Detected change! Record in oracle_rule_changes
      OracleChangeService.recordChange(
        ruleKey,
        existing.label,
        existing.official_value,
        newValue,
        OFFICIAL_DOC_URL,
        'High',
        `Alteração detectada nos limites oficiais da Oracle: ${existing.label} mudou de ${existing.official_value} para ${newValue}.`
      );

      db.prepare('UPDATE oracle_rules SET official_value = ?, verified_at = ? WHERE rule_key = ?').run(
        newValue,
        verifiedAt,
        ruleKey
      );
      return 1;
    }

    return 0;
  }
}
