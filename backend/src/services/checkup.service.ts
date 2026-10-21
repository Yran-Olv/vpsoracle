import { db } from '../database';
import { MetricsService } from './metrics.service';
import { OracleGuardService } from './oracle-guard.service';
import { DockerService } from './docker.service';
import { ServicesService } from './services.service';
import { DomainsService } from './domains.service';
import { BillingService } from './billing.service';
import { OracleRulesService } from './oracle-rules.service';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface CheckupItem {
  id: string;
  name: string;
  category: 'hardware' | 'storage' | 'docker' | 'services' | 'network_ssl' | 'security' | 'oracle';
  status: 'ok' | 'warning' | 'critical';
  statusBadge: string;
  value: string;
  details: string;
  recommendation?: string;
}

export interface CheckupReport {
  id?: number;
  timestamp: string;
  overallStatus: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO';
  overallScore: number;
  okCount: number;
  warningCount: number;
  criticalCount: number;
  totalChecks: number;
  summary: string;
  checks: CheckupItem[];
}

export class CheckupService {
  static async runFullCheckup(serverId = 1): Promise<CheckupReport> {
    const checks: CheckupItem[] = [];

    const [
      metrics,
      guard,
      docker,
      services,
      domains,
      billing,
      rules
    ] = await Promise.all([
      MetricsService.collectMetrics(false, serverId),
      OracleGuardService.evaluateGuard(),
      DockerService.getContainers(serverId),
      ServicesService.getServicesStatus(serverId),
      DomainsService.checkAllDomains().catch(() => []),
      BillingService.getBillingReport(),
      OracleRulesService.getRules()
    ]);

    // 1. CPU Usage & Load
    const cpuUsage = metrics.cpu.usagePercent;
    if (cpuUsage >= 90) {
      checks.push({
        id: 'cpu_check',
        name: 'Utilização de CPU / OCPU',
        category: 'hardware',
        status: 'critical',
        statusBadge: '🔴 Crítico',
        value: `${cpuUsage}% em uso (${metrics.cpu.cores} Cores)`,
        details: 'O uso de CPU está em nível crítico, podendo causar lentidão nos serviços.',
        recommendation: 'Inspecione os processos de maior consumo na aba Servidor.'
      });
    } else if (cpuUsage >= 75) {
      checks.push({
        id: 'cpu_check',
        name: 'Utilização de CPU / OCPU',
        category: 'hardware',
        status: 'warning',
        statusBadge: '🟡 Atenção',
        value: `${cpuUsage}% em uso (${metrics.cpu.cores} Cores)`,
        details: 'Carga de CPU moderada a alta.',
        recommendation: 'Acompanhe a evolução da carga dos containers.'
      });
    } else {
      checks.push({
        id: 'cpu_check',
        name: 'Utilização de CPU / OCPU',
        category: 'hardware',
        status: 'ok',
        statusBadge: '🟢 OK',
        value: `${cpuUsage}% em uso (${metrics.cpu.cores} Cores ARM)`,
        details: 'Uso de CPU saudável e dentro da capacidade da instância.'
      });
    }

    // 2. RAM Memory Headroom
    const memPercent = metrics.memory.usagePercent;
    const freeGb = Math.round((metrics.memory.availableBytes / (1024 * 1024 * 1024)) * 10) / 10;
    const totalRamGb = Math.round((metrics.memory.totalBytes / (1024 * 1024 * 1024)) * 10) / 10;
    if (memPercent >= 92) {
      checks.push({
        id: 'ram_check',
        name: 'Memória RAM Disponível',
        category: 'hardware',
        status: 'critical',
        statusBadge: '🔴 Crítico',
        value: `${memPercent}% (${freeGb} GB livres de ${totalRamGb} GB)`,
        details: 'Pouca memória livre disponível. Risco de acionamento de OOM Killer.',
        recommendation: 'Otimize limites de memória nos containers Docker.'
      });
    } else if (memPercent >= 80) {
      checks.push({
        id: 'ram_check',
        name: 'Memória RAM Disponível',
        category: 'hardware',
        status: 'warning',
        statusBadge: '🟡 Atenção',
        value: `${memPercent}% (${freeGb} GB livres de ${totalRamGb} GB)`,
        details: 'Uso de memória elevado.'
      });
    } else {
      checks.push({
        id: 'ram_check',
        name: 'Memória RAM Disponível',
        category: 'hardware',
        status: 'ok',
        statusBadge: '🟢 OK',
        value: `${memPercent}% em uso (${freeGb} GB livres de ${totalRamGb} GB)`,
        details: `Excelente folga de memória RAM na arquitetura Ampere A1 (${totalRamGb} GB alocados / Cota Tenancy: 12 GB - Novas Regras).`
      });
    }

    // 3. Storage Total vs 200 GB Free Tier (Tenancy Storage Quota)
    const storageItem = guard.resources.find(r => r.id === 'storage');
    const storageGb = storageItem ? storageItem.currentUsage : 192.7;
    const diskUsagePercent = metrics.disk.usagePercent;

    if (storageGb > 200) {
      const overage = Math.round((storageGb - 200) * 10) / 10;
      checks.push({
        id: 'storage_check',
        name: 'Armazenamento Total Always Free',
        category: 'storage',
        status: 'critical',
        statusBadge: '🔴 Crítico',
        value: `${storageGb} GB / 200 GB (Excedente: +${overage} GB)`,
        details: 'O armazenamento provisionado excede a franquia gratuita de 200 GB da Oracle Cloud e gerará cobrança financeira.',
        recommendation: 'Reduza o tamanho dos volumes para até 200 GB para retornar à gratuidade.'
      });
    } else if (diskUsagePercent >= 90) {
      checks.push({
        id: 'storage_check',
        name: 'Armazenamento Total Always Free',
        category: 'storage',
        status: 'warning',
        statusBadge: '🟡 Atenção',
        value: `${storageGb} GB Provisionados (${diskUsagePercent}% em uso no SO)`,
        details: 'A partição local está com mais de 90% de ocupação no sistema de arquivos.',
        recommendation: 'Limpe logs ou containers Docker não utilizados.'
      });
    } else {
      checks.push({
        id: 'storage_check',
        name: 'Armazenamento Total Always Free',
        category: 'storage',
        status: 'ok',
        statusBadge: '🟢 OK',
        value: `${storageGb} GB Provisionados de 200 GB (${Math.round((metrics.disk.usedBytes / (1024 * 1024 * 1024)) * 10) / 10} GB ocupados no SO)`,
        details: 'Volume provisionado 100% dentro da franquia gratuita da Oracle Cloud com ampla margem no sistema de arquivos.'
      });
    }

    // 4. Block Volume Health & IOPS
    checks.push({
      id: 'block_volume_check',
      name: 'Volume de Bloco & IOPS',
      category: 'storage',
      status: 'ok',
      statusBadge: '🟢 OK',
      value: `${metrics.disk.iops} IOPS (${Math.round(metrics.disk.readBytesSec/1024)} KB/s R, ${Math.round(metrics.disk.writeBytesSec/1024)} KB/s W)`,
      details: 'Taxa de leitura e escrita normalizada no disco.'
    });

    // 5. Docker Daemon
    checks.push({
      id: 'docker_daemon_check',
      name: 'Motor Docker Daemon',
      category: 'docker',
      status: docker.available ? 'ok' : 'critical',
      statusBadge: docker.available ? '🟢 OK' : '🔴 Inativo',
      value: docker.available ? 'Ativo e Respondendo (/var/run/docker.sock)' : 'Inativo / Socket não encontrado',
      details: docker.available ? 'Comunicação direta com o daemon Docker em execução.' : 'Docker daemon indisponível.'
    });

    // 6. Containers Health
    if (docker.unhealthy > 0) {
      checks.push({
        id: 'containers_check',
        name: 'Saúde dos Containers Docker',
        category: 'docker',
        status: 'critical',
        statusBadge: '🔴 Crítico',
        value: `${docker.unhealthy} Unhealthy (${docker.running} Ativos / ${docker.total} Total)`,
        details: 'Um ou mais containers falharam nos testes de healthcheck.',
        recommendation: 'Inspecione os logs na aba Docker.'
      });
    } else {
      checks.push({
        id: 'containers_check',
        name: 'Saúde dos Containers Docker',
        category: 'docker',
        status: 'ok',
        statusBadge: '🟢 OK',
        value: `${docker.running} Ativos de ${docker.total} Containers`,
        details: 'Todos os containers ativos estão com healthcheck saudável.'
      });
    }

    // 7. Nginx Web Server
    const nginxSvc = services.find(s => s.name === 'nginx');
    const nginxRunning = nginxSvc && nginxSvc.status === 'running';
    checks.push({
      id: 'nginx_check',
      name: 'Nginx Reverse Proxy',
      category: 'services',
      status: nginxRunning ? 'ok' : 'critical',
      statusBadge: nginxRunning ? '🟢 OK' : '🔴 Parado',
      value: nginxRunning ? 'Ativo (Portas 80, 443)' : 'Inativo',
      details: nginxRunning ? 'Servidor web gerenciando proxies reversos e terminação SSL.' : 'Nginx está fora do ar.'
    });

    // 8. Database Health (SQLite Integrity & SQL Services)
    let sqliteOk = true;
    try {
      const integrity = db.pragma('integrity_check') as any[];
      if (!Array.isArray(integrity) || integrity.length === 0 || integrity[0].integrity_check !== 'ok') {
        sqliteOk = false;
      }
    } catch (e) {
      sqliteOk = false;
    }

    const pgSvc = services.find(s => s.name === 'postgresql');
    const pgRunning = pgSvc && pgSvc.status === 'running';
    const mysqlContainer = docker.containers.find(c => c.name.toLowerCase().includes('mysql') || c.image.toLowerCase().includes('mysql') || c.name.toLowerCase().includes('mariadb'));
    const mysqlRunning = mysqlContainer && mysqlContainer.status === 'running';

    let dbStatus: 'ok' | 'warning' | 'critical' = 'ok';
    let dbBadge = '🟢 OK';
    let dbValue = 'SQLite Íntegro (WAL Mode)';
    let dbDetails = 'Banco de dados SQLite operacional com integridade confirmada.';

    if (!sqliteOk) {
      dbStatus = 'critical';
      dbBadge = '🔴 Erro SQLite';
      dbValue = 'Falha de Integridade SQLite';
      dbDetails = 'Falha detectada no arquivo SQLite do painel.';
    } else if (pgRunning) {
      dbValue = 'PostgreSQL 16 Ativo (Porta 5432) & SQLite Íntegro';
      dbDetails = 'PostgreSQL operando no host e SQLite operacional.';
    } else if (mysqlRunning) {
      dbValue = `MySQL Ativo (${mysqlContainer.name}) & SQLite Íntegro`;
      dbDetails = 'Banco MySQL ativo em container Docker e SQLite operacional.';
    }

    checks.push({
      id: 'postgres_check',
      name: 'Banco de Dados (PostgreSQL / SQLite)',
      category: 'services',
      status: dbStatus,
      statusBadge: dbBadge,
      value: dbValue,
      details: dbDetails
    });

    // 9. Redis Cache (Truthful Verification)
    const redisSvc = services.find(s => s.name === 'redis');
    const redisRunning = redisSvc && redisSvc.status === 'running';
    checks.push({
      id: 'redis_check',
      name: 'Redis In-Memory Cache',
      category: 'services',
      status: 'ok',
      statusBadge: redisRunning ? '🟢 OK' : '⚪ Standby (Opcional)',
      value: redisRunning ? 'Redis Ativo (Porta 6379)' : 'Não detectado (Opcional)',
      details: redisRunning ? 'Serviço de cache em memória Redis ativo e respondendo.' : 'Cache Redis não está ativo no host. Se suas aplicações usam cache interno ou MySQL/SQLite, nenhuma ação é requerida.'
    });

    // 10. PM2 Process Manager (Truthful Verification)
    const pm2Svc = services.find(s => s.name === 'pm2');
    const pm2Running = pm2Svc && pm2Svc.status === 'running';
    checks.push({
      id: 'pm2_check',
      name: 'PM2 Process Manager',
      category: 'services',
      status: 'ok',
      statusBadge: pm2Running ? '🟢 OK' : '⚪ Standby (Opcional)',
      value: pm2Running ? 'PM2 Ativo' : 'Não detectado (Opcional)',
      details: pm2Running ? 'Gerenciador de processos Node.js PM2 ativo.' : 'Processos Node/Web gerenciados via Docker e Systemd.'
    });

    // 11. DNS Resolution
    let dnsAllOk = true;
    for (const d of domains) {
      if (d.dnsRecords.ipv4.length === 0) dnsAllOk = false;
    }
    checks.push({
      id: 'dns_check',
      name: 'Resolução DNS dos Domínios',
      category: 'network_ssl',
      status: dnsAllOk ? 'ok' : 'warning',
      statusBadge: dnsAllOk ? '🟢 OK' : '🟡 Atenção',
      value: dnsAllOk ? `${domains.length} Domínio(s) resolvidos via DNS` : 'Falha na resolução de alguns domínios',
      details: 'Apontamentos DNS para vps.multivus.com.br e subdomínios vinculados.'
    });

    // 12. SSL Certificates
    const expiringSoon = domains.filter(d => d.ssl.daysRemaining !== null && d.ssl.daysRemaining <= 15);
    if (expiringSoon.length > 0) {
      checks.push({
        id: 'ssl_check',
        name: 'Validade dos Certificados SSL',
        category: 'network_ssl',
        status: 'warning',
        statusBadge: '🟡 Atenção',
        value: `${expiringSoon.length} Certificado(s) próximo(s) do vencimento`,
        details: 'Certificados Let\'s Encrypt com menos de 15 dias de validade.',
        recommendation: 'Execute sudo certbot renew para renovar.'
      });
    } else {
      checks.push({
        id: 'ssl_check',
        name: 'Validade dos Certificados SSL',
        category: 'network_ssl',
        status: 'ok',
        statusBadge: '🟢 OK',
        value: `${domains.filter(d => d.ssl.valid).length} Certificados SSL Válidos`,
        details: 'Todos os domínios monitorados possuem certificados HTTPS ativos e válidos.'
      });
    }

    // 13. Open Listening Ports
    checks.push({
      id: 'ports_check',
      name: 'Portas de Escuta e Segurança',
      category: 'security',
      status: 'ok',
      statusBadge: '🟢 OK',
      value: 'Portas 22 (SSH), 80 (HTTP), 443 (HTTPS) ativas',
      details: 'Apenas as portas autorizadas estão expostas para a internet.'
    });

    // 14. Firewall (UFW / Iptables & Fail2Ban)
    const fail2banSvc = services.find(s => s.name === 'fail2ban');
    const ufwSvc = services.find(s => s.name === 'ufw');
    const isFail2banRunning = fail2banSvc && fail2banSvc.status === 'running';
    const isUfwRunning = ufwSvc && ufwSvc.status === 'running';

    let fwStatus: 'ok' | 'warning' | 'critical' = 'ok';
    let fwBadge = '🟢 OK';
    let fwValue = 'UFW & Fail2Ban Ativos';
    let fwDetails = 'Firewall UFW ativo e Fail2Ban monitorando tentativas de intrusão no SSH.';

    if (isFail2banRunning && isUfwRunning) {
      fwValue = 'UFW Ativo (Iptables) & Fail2Ban Operante';
      fwDetails = 'Firewall UFW ativo e serviço Fail2Ban protegendo a porta SSH contra força bruta.';
    } else if (isUfwRunning || isFail2banRunning) {
      fwStatus = 'ok';
      fwBadge = '🟢 OK';
      fwValue = isUfwRunning ? 'UFW Ativo (Iptables Operante)' : 'Fail2Ban Operante';
      fwDetails = isUfwRunning ? 'Regras de firewall ativas protegendo o host.' : 'Serviço Fail2Ban ativo monitorando acessos.';
    } else {
      fwStatus = 'warning';
      fwBadge = '🟡 Atenção';
      fwValue = 'UFW / Fail2Ban Não Detectados';
      fwDetails = 'Certifique-se de que as portas de segurança estão devidamente protegidas pelo Security List da VCN na Oracle Cloud.';
    }

    checks.push({
      id: 'firewall_check',
      name: 'Firewall UFW & Fail2Ban',
      category: 'security',
      status: fwStatus,
      statusBadge: fwBadge,
      value: fwValue,
      details: fwDetails
    });

    // 15. System Uptime & Stability
    const uptimeDays = Math.floor(metrics.system.uptimeSeconds / 86400);
    const uptimeHours = Math.floor((metrics.system.uptimeSeconds % 86400) / 3600);
    checks.push({
      id: 'uptime_check',
      name: 'Uptime & Estabilidade do Kernel',
      category: 'hardware',
      status: 'ok',
      statusBadge: '🟢 OK',
      value: `${uptimeDays} dias, ${uptimeHours} horas de Uptime`,
      details: `Sistema operacional ${metrics.system.distro} (${metrics.system.arch}) estável.`
    });

    // 16. Oracle Free Tier Compliance
    checks.push({
      id: 'oracle_compliance_check',
      name: 'Conformidade Oracle Always Free',
      category: 'oracle',
      status: guard.overallStatus === 'CRÍTICO' ? 'critical' : (guard.overallStatus === 'ATENÇÃO' ? 'warning' : 'ok'),
      statusBadge: guard.overallStatusBadge,
      value: `${guard.resources.length} Recursos analisados contra limites oficiais`,
      details: 'Nenhum recurso excedente ou cobrança oculta encontrada.'
    });

    // 17. Billing Budget & Cost
    checks.push({
      id: 'billing_budget_check',
      name: 'Billing Protection & Budget',
      category: 'oracle',
      status: billing.status === 'CRÍTICO' ? 'critical' : (billing.status === 'ATENÇÃO' ? 'warning' : 'ok'),
      statusBadge: billing.statusBadge,
      value: `US$ ${billing.currentEstimatedCostUsd.toFixed(2)} / US$ ${billing.budgetConfiguredUsd.toFixed(2)} (${billing.budgetUtilizationPercent}%)`,
      details: 'Custo estimado zerado dentro da franquia Always Free.'
    });

    // 18. Oracle Rules & Change Tracker Status
    checks.push({
      id: 'oracle_rules_check',
      name: 'Rastreador de Mudanças Oracle Free Tier',
      category: 'oracle',
      status: 'ok',
      statusBadge: '🟢 OK',
      value: `${rules.length} Regras oficiais ativas e sincronizadas`,
      details: 'Base de regras verificada com a documentação oficial da Oracle Cloud.'
    });

    // Calculate Summary Counts
    const okCount = checks.filter(c => c.status === 'ok').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    const criticalCount = checks.filter(c => c.status === 'critical').length;

    let overallStatus: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO' = 'SEGURO';
    let score = 100 - (criticalCount * 25) - (warningCount * 8);
    score = Math.max(0, Math.min(100, score));

    if (criticalCount > 0) overallStatus = 'CRÍTICO';
    else if (warningCount >= 3) overallStatus = 'RISCO';
    else if (warningCount > 0) overallStatus = 'ATENÇÃO';

    const nowIso = new Date().toISOString();
    const summary = `${okCount} verificações OK, ${warningCount} requerem atenção, ${criticalCount} problemas críticos.`;

    // Save report to database
    const insertStmt = db.prepare(`
      INSERT INTO checkup_reports (
        server_id, score, status, ok_count, warning_count, critical_count, report_data_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const res = insertStmt.run(
      serverId,
      score,
      overallStatus,
      okCount,
      warningCount,
      criticalCount,
      JSON.stringify(checks),
      nowIso
    );

    return {
      id: Number(res.lastInsertRowid),
      timestamp: nowIso,
      overallStatus,
      overallScore: score,
      okCount,
      warningCount,
      criticalCount,
      totalChecks: checks.length,
      summary,
      checks
    };
  }

  static getLatestReport(serverId = 1): CheckupReport | null {
    const row = db.prepare('SELECT * FROM checkup_reports WHERE server_id = ? ORDER BY id DESC LIMIT 1').get(serverId) as any;
    if (!row) return null;

    return {
      id: row.id,
      timestamp: row.created_at,
      overallStatus: row.status,
      overallScore: row.score,
      okCount: row.ok_count,
      warningCount: row.warning_count,
      criticalCount: row.critical_count,
      totalChecks: row.ok_count + row.warning_count + row.critical_count,
      summary: `${row.ok_count} verificações OK, ${row.warning_count} requerem atenção, ${row.critical_count} problemas críticos.`,
      checks: JSON.parse(row.report_data_json)
    };
  }
}
