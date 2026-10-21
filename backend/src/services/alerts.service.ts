import { db } from '../database';
import { MetricsService, SystemMetrics } from './metrics.service';
import axios from 'axios';

export interface AlertConfigItem {
  id: number;
  metricKey: string;
  label: string;
  operator: 'gt' | 'lt' | 'eq';
  thresholdValue: number;
  severity: 'info' | 'warning' | 'critical';
  isEnabled: boolean;
}

export interface AlertHistoryItem {
  id: number;
  alertKey: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  triggeredAt: string;
  resolvedAt: string | null;
  isAcknowledged: boolean;
}

export interface IncidentItem {
  id: number;
  targetType: string;
  targetName: string;
  status: 'ongoing' | 'resolved';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  startedAt: string;
  resolvedAt: string | null;
  downtimeSeconds: number;
}

export class AlertsService {
  static getAlertsConfig(): AlertConfigItem[] {
    const rows = db.prepare('SELECT * FROM alerts_config ORDER BY id ASC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      metricKey: r.metric_key,
      label: r.label,
      operator: r.operator,
      thresholdValue: r.threshold_value,
      severity: r.severity,
      isEnabled: Boolean(r.is_enabled)
    }));
  }

  static updateAlertConfig(id: number, thresholdValue: number, severity: string, isEnabled: boolean): boolean {
    const info = db.prepare(`
      UPDATE alerts_config
      SET threshold_value = ?, severity = ?, is_enabled = ?
      WHERE id = ?
    `).run(thresholdValue, severity, isEnabled ? 1 : 0, id);
    return info.changes > 0;
  }

  static getAlertHistory(limit = 50): AlertHistoryItem[] {
    const rows = db.prepare('SELECT * FROM alerts_history ORDER BY id DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => ({
      id: r.id,
      alertKey: r.alert_key,
      severity: r.severity,
      title: r.title,
      message: r.message,
      triggeredAt: r.triggered_at,
      resolvedAt: r.resolved_at,
      isAcknowledged: Boolean(r.is_acknowledged)
    }));
  }

  static acknowledgeAlert(id: number): boolean {
    const info = db.prepare('UPDATE alerts_history SET is_acknowledged = 1 WHERE id = ?').run(id);
    return info.changes > 0;
  }

  static getIncidents(limit = 50): IncidentItem[] {
    const rows = db.prepare('SELECT * FROM incidents ORDER BY id DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => ({
      id: r.id,
      targetType: r.target_type,
      targetName: r.target_name,
      status: r.status,
      severity: r.severity,
      message: r.message,
      startedAt: r.started_at,
      resolvedAt: r.resolved_at,
      downtimeSeconds: r.downtime_seconds || 0
    }));
  }

  static async evaluateMetricsAlerts(metrics: SystemMetrics): Promise<void> {
    const configs = this.getAlertsConfig().filter(c => c.isEnabled);

    for (const c of configs) {
      let currentValue: number | null = null;

      switch (c.metricKey) {
        case 'cpu_usage':
          currentValue = metrics.cpu.usagePercent;
          break;
        case 'memory_usage':
          currentValue = metrics.memory.usagePercent;
          break;
        case 'disk_usage':
          currentValue = metrics.disk.usagePercent;
          break;
        case 'swap_usage':
          currentValue = metrics.memory.swapUsagePercent;
          break;
        case 'load_avg':
          currentValue = metrics.cpu.load5m;
          break;
      }

      if (currentValue === null) continue;

      let isTriggered = false;
      if (c.operator === 'gt' && currentValue > c.thresholdValue) isTriggered = true;
      if (c.operator === 'lt' && currentValue < c.thresholdValue) isTriggered = true;

      // Check if alert is already active
      const activeAlert = db.prepare(`
        SELECT * FROM alerts_history 
        WHERE alert_key = ? AND resolved_at IS NULL
        ORDER BY id DESC LIMIT 1
      `).get(c.metricKey) as any;

      if (isTriggered && !activeAlert) {
        // Trigger alert
        const title = `Alerta: ${c.label} (${currentValue}% > ${c.thresholdValue}%)`;
        const message = `O valor atual de ${c.label} atingiu ${currentValue}, ultrapassando o limiar de alerta de ${c.thresholdValue}.`;
        
        db.prepare(`
          INSERT INTO alerts_history (alert_key, severity, title, message, triggered_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(c.metricKey, c.severity, title, message);

        await this.dispatchNotification(title, message, c.severity);
      } else if (!isTriggered && activeAlert) {
        // Resolve alert
        db.prepare('UPDATE alerts_history SET resolved_at = CURRENT_TIMESTAMP WHERE id = ?').run(activeAlert.id);
      }
    }
  }

  private static async dispatchNotification(title: string, message: string, severity: string): Promise<void> {
    const webhookSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'webhook_url'").get() as any;
    const webhookUrl = webhookSetting?.value;

    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        await axios.post(webhookUrl, {
          title,
          message,
          severity,
          source: 'VPS Multivus Monitor (vps.multivus.com.br)',
          timestamp: new Date().toISOString()
        }, { timeout: 4000 });
      } catch (err: any) {
        console.warn('Webhook notification failed:', err.message);
      }
    }
  }
}
