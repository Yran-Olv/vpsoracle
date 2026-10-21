import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { config } from '../config';

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.dbPath);

// Enable WAL mode for high concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metrics_raw (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      cpu_percent REAL NOT NULL,
      memory_used_bytes INTEGER NOT NULL,
      memory_total_bytes INTEGER NOT NULL,
      memory_percent REAL NOT NULL,
      swap_used_bytes INTEGER NOT NULL,
      swap_total_bytes INTEGER NOT NULL,
      disk_used_bytes INTEGER NOT NULL,
      disk_total_bytes INTEGER NOT NULL,
      disk_percent REAL NOT NULL,
      disk_read_bytes_sec REAL NOT NULL DEFAULT 0,
      disk_write_bytes_sec REAL NOT NULL DEFAULT 0,
      iops REAL NOT NULL DEFAULT 0,
      net_rx_bytes_sec REAL NOT NULL DEFAULT 0,
      net_tx_bytes_sec REAL NOT NULL DEFAULT 0,
      load_1m REAL NOT NULL,
      load_5m REAL NOT NULL,
      load_15m REAL NOT NULL,
      uptime_seconds INTEGER NOT NULL,
      process_count INTEGER NOT NULL,
      extra_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_raw_timestamp ON metrics_raw(timestamp);

    CREATE TABLE IF NOT EXISTS metrics_hourly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER UNIQUE NOT NULL,
      avg_cpu REAL NOT NULL,
      max_cpu REAL NOT NULL,
      min_cpu REAL NOT NULL,
      avg_mem REAL NOT NULL,
      max_mem REAL NOT NULL,
      avg_disk REAL NOT NULL,
      max_disk REAL NOT NULL,
      total_net_rx INTEGER NOT NULL DEFAULT 0,
      total_net_tx INTEGER NOT NULL DEFAULT 0,
      sample_count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_hourly_timestamp ON metrics_hourly(timestamp);

    CREATE TABLE IF NOT EXISTS oracle_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      rule_key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      official_value TEXT NOT NULL,
      official_unit TEXT NOT NULL,
      classification TEXT NOT NULL DEFAULT 'Oficial',
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      notes TEXT,
      verified_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS oracle_rule_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_key TEXT NOT NULL,
      rule_label TEXT NOT NULL,
      old_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      source_url TEXT NOT NULL,
      impact_level TEXT NOT NULL DEFAULT 'Medium',
      impact_description TEXT NOT NULL,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_alerted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS oracle_news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT UNIQUE NOT NULL,
      published_at DATETIME NOT NULL,
      summary TEXT NOT NULL,
      classification TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      is_disclaimer_required INTEGER DEFAULT 0,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_oracle_news_published ON oracle_news(published_at DESC);

    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_name TEXT UNIQUE NOT NULL,
      target_url TEXT NOT NULL,
      check_interval_sec INTEGER DEFAULT 60,
      is_active INTEGER DEFAULT 1,
      last_status_code INTEGER,
      last_response_time_ms INTEGER,
      ssl_valid INTEGER DEFAULT 0,
      ssl_issuer TEXT,
      ssl_days_left INTEGER,
      ssl_expires_at DATETIME,
      last_checked_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL, -- 'domain' | 'service' | 'system'
      target_name TEXT NOT NULL,
      status TEXT NOT NULL, -- 'ongoing' | 'resolved'
      severity TEXT NOT NULL DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
      message TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      downtime_seconds INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_incidents_target ON incidents(target_name, status);

    CREATE TABLE IF NOT EXISTS alerts_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      operator TEXT NOT NULL, -- 'gt' | 'lt' | 'eq'
      threshold_value REAL NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      is_enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS alerts_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_key TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      is_acknowledged INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS checkup_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      score INTEGER NOT NULL,
      status TEXT NOT NULL, -- 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO'
      ok_count INTEGER NOT NULL,
      warning_count INTEGER NOT NULL,
      critical_count INTEGER NOT NULL,
      report_data_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      username TEXT NOT NULL,
      ip_address TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin user if not exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(config.adminUsername);
  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(config.adminInitialPassword, salt);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
      config.adminUsername,
      hash,
      'admin'
    );
  }

  // Seed default domains if empty
  const domainCount = (db.prepare('SELECT COUNT(*) as count FROM domains').get() as { count: number }).count;
  if (domainCount === 0) {
    const defaultDomains = [
      { name: 'vps.multivus.com.br', url: 'https://vps.multivus.com.br' },
      { name: 'maf.multivus.com.br', url: 'https://maf.multivus.com.br' },
      { name: 'multivusos.multivus.com.br', url: 'https://multivusos.multivus.com.br' },
      { name: 'painel.multivus.com.br', url: 'https://painel.multivus.com.br' }
    ];
    const insertDomain = db.prepare('INSERT INTO domains (domain_name, target_url) VALUES (?, ?)');
    for (const d of defaultDomains) {
      insertDomain.run(d.name, d.url);
    }
  }

  // Seed default alert thresholds
  const alertCount = (db.prepare('SELECT COUNT(*) as count FROM alerts_config').get() as { count: number }).count;
  if (alertCount === 0) {
    const defaultAlerts = [
      { key: 'cpu_usage', label: 'CPU Usage', operator: 'gt', threshold: 85, severity: 'warning' },
      { key: 'memory_usage', label: 'RAM Usage', operator: 'gt', threshold: 90, severity: 'critical' },
      { key: 'disk_usage', label: 'Storage Usage', operator: 'gt', threshold: 85, severity: 'critical' },
      { key: 'swap_usage', label: 'Swap Usage', operator: 'gt', threshold: 75, severity: 'warning' },
      { key: 'load_avg', label: 'Load Average (5m)', operator: 'gt', threshold: 6.0, severity: 'warning' },
      { key: 'ssl_expiry_days', label: 'SSL Expiration Days', operator: 'lt', threshold: 15, severity: 'warning' },
      { key: 'oracle_storage_limit', label: 'Oracle Storage Free Limit (200GB)', operator: 'gt', threshold: 180, severity: 'critical' },
      { key: 'oracle_budget_alert', label: 'Budget Utilization %', operator: 'gt', threshold: 90, severity: 'critical' }
    ];
    const insertAlert = db.prepare('INSERT INTO alerts_config (metric_key, label, operator, threshold_value, severity) VALUES (?, ?, ?, ?, ?)');
    for (const a of defaultAlerts) {
      insertAlert.run(a.key, a.label, a.operator, a.threshold, a.severity);
    }
  }

  // Seed default system settings if missing
  const defaultSettings: Record<string, string> = {
    budget_usd: '1.00',
    estimated_cost_usd: '0.00',
    metrics_interval_sec: '10',
    health_interval_sec: '30',
    raw_retention_days: '7',
    hourly_retention_days: '90',
    timezone: 'America/Sao_Paulo',
    theme: 'dark',
    email_alerts_enabled: 'false',
    alert_email_to: '',
    webhook_url: '',
    oci_tenancy_configured: 'false'
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)');
  for (const [key, val] of Object.entries(defaultSettings)) {
    insertSetting.run(key, val);
  }
}
