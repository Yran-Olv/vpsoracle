import cron from 'node-cron';
import { MetricsService } from '../services/metrics.service';
import { DomainsService } from '../services/domains.service';
import { AlertsService } from '../services/alerts.service';
import { OracleNewsService } from '../services/oracle-news.service';
import { OracleRulesService } from '../services/oracle-rules.service';
import { config } from '../config';

export function startBackgroundJobs() {
  console.log('Iniciando jobs em segundo plano...');

  // 1. Live Metrics Collector & Alert Evaluation (every 10s by default)
  const metricsIntervalMs = config.metricsIntervalSeconds * 1000;
  setInterval(async () => {
    try {
      const metrics = await MetricsService.collectMetrics();
      MetricsService.saveRawMetrics(metrics);
      await AlertsService.evaluateMetricsAlerts(metrics);
    } catch (err) {
      console.error('Erro no ciclo de coleta de métricas:', err);
    }
  }, metricsIntervalMs);

  // 2. Domain & SSL Healthcheck (every 30s by default)
  const healthIntervalMs = config.healthCheckIntervalSeconds * 1000;
  setInterval(async () => {
    try {
      await DomainsService.checkAllDomains();
    } catch (err) {
      console.error('Erro no ciclo de verificação de domínios:', err);
    }
  }, healthIntervalMs);

  // 3. Hourly Aggregator & Pruning (every hour at minute 0)
  cron.schedule('0 * * * *', () => {
    try {
      MetricsService.pruneOldMetrics();
    } catch (err) {
      console.error('Erro no ciclo de limpeza e agregação de métricas:', err);
    }
  });

  // 4. Oracle Free Tier Rules & News Aggregator (every day at 04:00 AM)
  cron.schedule('0 4 * * *', async () => {
    try {
      console.log('Executando sincronização diária de notícias e regras Oracle...');
      await OracleRulesService.refreshRulesFromOracle();
      await OracleNewsService.refreshNews();
    } catch (err) {
      console.error('Erro na sincronização diária de notícias/regras:', err);
    }
  });

  // Run initial seed / fetch asynchronously on startup
  setTimeout(async () => {
    try {
      OracleRulesService.ensureInitialized();
      OracleNewsService.ensureSeedNews();
      await DomainsService.checkAllDomains();
    } catch (err) {}
  }, 2000);
}
