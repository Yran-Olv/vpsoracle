import { MetricsService } from './metrics.service';
import { OracleGuardService } from './oracle-guard.service';
import { DockerService } from './docker.service';
import { ServicesService } from './services.service';
import { DomainsService } from './domains.service';
import { BillingService } from './billing.service';
import { RiskEngineService } from './risk.service';
import { OracleNewsService } from './oracle-news.service';

export class ReportService {
  static async generateMarkdownReport(): Promise<string> {
    const [metrics, guard, docker, services, domains, billing, risk, news] = await Promise.all([
      MetricsService.collectMetrics(),
      OracleGuardService.evaluateGuard(),
      DockerService.getContainers(),
      ServicesService.getServicesStatus(),
      DomainsService.checkAllDomains().catch(() => []),
      BillingService.getBillingReport(),
      RiskEngineService.evaluateRisk(),
      OracleNewsService.getNews('7d')
    ]);

    const now = new Date();
    const formattedDate = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    let md = `# Relatório de Diagnóstico — VPS Multivus\n`;
    md += `**Data da Emissão:** ${formattedDate} (America/Sao_Paulo)\n`;
    md += `**Host:** ${metrics.system.hostname} | **IP:** 147.15.19.44 | **Domínio:** vps.multivus.com.br\n`;
    md += `**Plataforma:** ${metrics.system.distro} (${metrics.system.arch}) | **Kernel:** ${metrics.system.kernel}\n`;
    md += `**Risk Score Global:** ${risk.score}/100 (${risk.statusBadge})\n\n`;

    md += `## 1. Oracle Free Guard (Always Free Compliance)\n`;
    md += `Status Geral: **${guard.overallStatusBadge}**\n\n`;
    md += `| Recurso | Uso Atual | Limite Always Free | Utilização | Margem Restante | Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const r of guard.resources) {
      md += `| ${r.name} | ${r.formattedCurrent} | ${r.formattedLimit} | ${r.usagePercent}% | ${r.remainingMargin} | ${r.statusBadge} |\n`;
    }
    md += `\n> **Política de Reclamação por Ociosidade:** Percentil 95 CPU: ${guard.idleReclamation.cpu95thPercentile}% | RAM: ${guard.idleReclamation.ram95thPercentile}% (${guard.idleReclamation.status})\n\n`;

    md += `## 2. Telemetria do Servidor (Métricas em Tempo Real)\n`;
    md += `- **CPU:** ${metrics.cpu.usagePercent}% (${metrics.cpu.cores} Cores ARM @ ${metrics.cpu.speed} GHz)\n`;
    md += `- **Load Average:** 1m: ${metrics.cpu.load1m} | 5m: ${metrics.cpu.load5m} | 15m: ${metrics.cpu.load15m}\n`;
    md += `- **Memória RAM:** ${metrics.memory.usagePercent}% (${Math.round(metrics.memory.usedBytes / (1024**3) * 10)/10} GB usados / ${Math.round(metrics.memory.totalBytes / (1024**3) * 10)/10} GB total)\n`;
    md += `- **Swap:** ${metrics.memory.swapUsagePercent}% (${Math.round(metrics.memory.swapUsedBytes / (1024**2))} MB / ${Math.round(metrics.memory.swapTotalBytes / (1024**2))} MB)\n`;
    md += `- **Armazenamento:** ${metrics.disk.usagePercent}% (${Math.round(metrics.disk.usedBytes / (1024**3) * 10)/10} GB ocupados / ${Math.round(metrics.disk.totalBytes / (1024**3) * 10)/10} GB total)\n`;
    md += `- **Disco IOPS:** ${metrics.disk.iops} IOPS (Read: ${Math.round(metrics.disk.readBytesSec/1024)} KB/s, Write: ${Math.round(metrics.disk.writeBytesSec/1024)} KB/s)\n`;
    md += `- **Uptime:** ${Math.floor(metrics.system.uptimeSeconds / 86400)} dias, ${Math.floor((metrics.system.uptimeSeconds % 86400) / 3600)} horas\n\n`;

    md += `## 3. Containers Docker (${docker.running} Ativos / ${docker.total} Total)\n`;
    if (docker.containers.length === 0) {
      md += `*Nenhum container Docker ativo no momento.*\n\n`;
    } else {
      md += `| Container | Imagem | Status | Health | CPU | RAM | Portas |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      for (const c of docker.containers) {
        const portsStr = c.ports.map(p => p.hostPort ? `${p.hostPort}->${p.containerPort}` : p.containerPort).join(', ') || '-';
        md += `| ${c.name} | ${c.image} | ${c.status} | ${c.health} | ${c.cpuPercent}% | ${Math.round(c.memoryUsageBytes / (1024**2))} MB | ${portsStr} |\n`;
      }
      md += `\n`;
    }

    md += `## 4. Serviços do Sistema\n`;
    md += `| Serviço | Categoria | Status | Descrição |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    for (const s of services) {
      const badge = s.status === 'running' ? '🟢 Ativo' : (s.status === 'warning' ? '🟡 Atenção' : '🔴 Parado');
      md += `| ${s.label} | ${s.category} | ${badge} | ${s.description} |\n`;
    }
    md += `\n`;

    md += `## 5. Monitor de Domínios e SSL\n`;
    md += `| Domínio | Status HTTP | Latência | SSL Válido | Dias Restantes | Emissor |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const d of domains) {
      md += `| ${d.domainName} | ${d.statusCode || 'Off'} | ${d.responseTimeMs ? d.responseTimeMs + 'ms' : '-'} | ${d.ssl.valid ? 'Sim' : 'Não'} | ${d.ssl.daysRemaining !== null ? d.ssl.daysRemaining + ' dias' : '-'} | ${d.ssl.issuer || '-'} |\n`;
    }
    md += `\n`;

    md += `## 6. Billing Protection & Budget\n`;
    md += `- **Budget Configurado:** US$ ${billing.budgetConfiguredUsd.toFixed(2)}\n`;
    md += `- **Custo Estimado Atual:** US$ ${billing.currentEstimatedCostUsd.toFixed(2)} (${billing.statusBadge})\n`;
    md += `- **Utilização do Budget:** ${billing.budgetUtilizationPercent}%\n`;
    md += `> ${billing.disclaimer}\n\n`;

    md += `## 7. Fatores de Risco Identificados\n`;
    if (risk.riskFactors.length === 0) {
      md += `*Nenhum fator de risco crítico detectado no momento.*\n\n`;
    } else {
      for (const rf of risk.riskFactors) {
        md += `### [${rf.severity.toUpperCase()}] ${rf.title}\n`;
        md += `- **O que aconteceu:** ${rf.whatHappened}\n`;
        md += `- **Por que importa:** ${rf.whyItMatters}\n`;
        md += `- **Ação recomendada:** ${rf.whatToDo}\n\n`;
      }
    }

    return md;
  }
}
