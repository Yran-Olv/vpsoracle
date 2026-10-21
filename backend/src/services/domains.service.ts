import https from 'https';
import http from 'http';
import tls from 'tls';
import dns from 'dns/promises';
import { db } from '../database';

export interface DomainCheckResult {
  id: number;
  domainName: string;
  targetUrl: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  isOnline: boolean;
  dnsRecords: {
    ipv4: string[];
    ipv6: string[];
  };
  ssl: {
    valid: boolean;
    issuer: string | null;
    validFrom: string | null;
    validTo: string | null;
    daysRemaining: number | null;
    status: 'valid' | 'warning' | 'critical' | 'expired' | 'none';
  };
  lastCheckedAt: string;
}

export class DomainsService {
  static getDomains(): any[] {
    return db.prepare('SELECT * FROM domains ORDER BY id ASC').all();
  }

  static addDomain(domainName: string, targetUrl: string): any {
    const cleanDomain = domainName.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const cleanUrl = targetUrl.trim().startsWith('http') ? targetUrl.trim() : `https://${cleanDomain}`;

    const stmt = db.prepare('INSERT INTO domains (domain_name, target_url) VALUES (?, ?)');
    const info = stmt.run(cleanDomain, cleanUrl);
    return { id: info.lastInsertRowid, domain_name: cleanDomain, target_url: cleanUrl };
  }

  static deleteDomain(id: number): boolean {
    const info = db.prepare('DELETE FROM domains WHERE id = ?').run(id);
    return info.changes > 0;
  }

  static async checkSingleDomain(domainRow: { id: number; domain_name: string; target_url: string }): Promise<DomainCheckResult> {
    const domainName = domainRow.domain_name;
    const targetUrl = domainRow.target_url;
    const startTime = Date.now();

    let statusCode: number | null = null;
    let responseTimeMs: number | null = null;
    let isOnline = false;
    let ipv4List: string[] = [];
    let ipv6List: string[] = [];

    // 1. DNS Resolution
    try {
      ipv4List = await dns.resolve4(domainName).catch(() => []);
      ipv6List = await dns.resolve6(domainName).catch(() => []);
    } catch (e) {}

    // 2. HTTP / HTTPS Ping
    try {
      const urlObj = new URL(targetUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      await new Promise<void>((resolve) => {
        const req = client.get(targetUrl, { timeout: 8000, headers: { 'User-Agent': 'VPS-Multivus-Monitor/1.0' } }, (res) => {
          statusCode = res.statusCode || null;
          responseTimeMs = Date.now() - startTime;
          isOnline = (statusCode !== null && statusCode >= 200 && statusCode < 400);
          res.resume(); // consume stream
          resolve();
        });

        req.on('error', () => {
          responseTimeMs = Date.now() - startTime;
          isOnline = false;
          resolve();
        });

        req.on('timeout', () => {
          req.destroy();
          responseTimeMs = 8000;
          isOnline = false;
          resolve();
        });
      });
    } catch (e) {
      isOnline = false;
    }

    // 3. SSL Certificate Inspection
    let sslValid = false;
    let sslIssuer: string | null = null;
    let sslValidFrom: string | null = null;
    let sslValidTo: string | null = null;
    let sslDaysLeft: number | null = null;
    let sslStatus: 'valid' | 'warning' | 'critical' | 'expired' | 'none' = 'none';

    try {
      const certInfo = await this.getSSLCertificate(domainName);
      if (certInfo) {
        sslIssuer = certInfo.issuer;
        sslValidFrom = certInfo.validFrom;
        sslValidTo = certInfo.validTo;
        sslDaysLeft = certInfo.daysRemaining;
        sslValid = certInfo.daysRemaining > 0;

        if (sslDaysLeft <= 0) {
          sslStatus = 'expired';
        } else if (sslDaysLeft <= 7) {
          sslStatus = 'critical';
        } else if (sslDaysLeft <= 30) {
          sslStatus = 'warning';
        } else {
          sslStatus = 'valid';
        }
      }
    } catch (e) {}

    // Update database
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE domains SET
        last_status_code = ?,
        last_response_time_ms = ?,
        ssl_valid = ?,
        ssl_issuer = ?,
        ssl_days_left = ?,
        ssl_expires_at = ?,
        last_checked_at = ?
      WHERE id = ?
    `).run(
      statusCode,
      responseTimeMs,
      sslValid ? 1 : 0,
      sslIssuer,
      sslDaysLeft,
      sslValidTo,
      nowIso,
      domainRow.id
    );

    // Track Incident if offline/recovered
    this.handleDomainIncident(domainName, isOnline, statusCode);

    return {
      id: domainRow.id,
      domainName,
      targetUrl,
      statusCode,
      responseTimeMs,
      isOnline,
      dnsRecords: {
        ipv4: ipv4List,
        ipv6: ipv6List
      },
      ssl: {
        valid: sslValid,
        issuer: sslIssuer,
        validFrom: sslValidFrom,
        validTo: sslValidTo,
        daysRemaining: sslDaysLeft,
        status: sslStatus
      },
      lastCheckedAt: nowIso
    };
  }

  private static async getSSLCertificate(domain: string, port = 443): Promise<{
    issuer: string;
    validFrom: string;
    validTo: string;
    daysRemaining: number;
  } | null> {
    return new Promise((resolve) => {
      const socket = tls.connect({
        host: domain,
        port,
        servername: domain,
        rejectUnauthorized: false,
        timeout: 5000
      }, () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert || !cert.valid_to) {
          return resolve(null);
        }

        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const now = new Date();
        const diffMs = validTo.getTime() - now.getTime();
        const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let rawIssuer = cert.issuer ? (cert.issuer.O || cert.issuer.CN || 'Unknown') : 'Unknown';
        let issuer = Array.isArray(rawIssuer) ? rawIssuer.join(', ') : String(rawIssuer);
        if (issuer.includes("Let's Encrypt")) issuer = "Let's Encrypt";
        if (issuer.includes("Cloudflare")) issuer = "Cloudflare Inc";

        resolve({
          issuer,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          daysRemaining
        });
      });

      socket.on('error', () => resolve(null));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
    });
  }

  private static handleDomainIncident(domain: string, isOnline: boolean, statusCode: number | null): void {
    const ongoingIncident = db.prepare(`
      SELECT * FROM incidents 
      WHERE target_type = 'domain' AND target_name = ? AND status = 'ongoing'
      ORDER BY id DESC LIMIT 1
    `).get(domain) as any;

    if (!isOnline && !ongoingIncident) {
      // Create new incident
      db.prepare(`
        INSERT INTO incidents (target_type, target_name, status, severity, message, started_at)
        VALUES ('domain', ?, 'ongoing', 'critical', ?, CURRENT_TIMESTAMP)
      `).run(domain, `Domínio ${domain} ficou offline (HTTP Status: ${statusCode || 'Sem resposta'}).`);
    } else if (isOnline && ongoingIncident) {
      // Resolve ongoing incident & calculate downtime
      const started = new Date(ongoingIncident.started_at).getTime();
      const resolved = Date.now();
      const downtimeSeconds = Math.max(0, Math.floor((resolved - started) / 1000));

      db.prepare(`
        UPDATE incidents 
        SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, downtime_seconds = ?
        WHERE id = ?
      `).run(downtimeSeconds, ongoingIncident.id);
    }
  }

  static async checkAllDomains(): Promise<DomainCheckResult[]> {
    const domains = this.getDomains();
    const results: DomainCheckResult[] = [];
    for (const d of domains) {
      const res = await this.checkSingleDomain(d);
      results.push(res);
    }
    return results;
  }
}
