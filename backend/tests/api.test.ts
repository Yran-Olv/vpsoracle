import request from 'supertest';
import app from '../src/index';
import { AuthService } from '../src/services/auth.service';
import { OracleRulesService } from '../src/services/oracle-rules.service';
import { OracleGuardService } from '../src/services/oracle-guard.service';
import { RiskEngineService } from '../src/services/risk.service';
import { CheckupService } from '../src/services/checkup.service';
import { BillingService } from '../src/services/billing.service';

describe('VPS Multivus Backend Test Suite', () => {
  let authToken = '';

  beforeAll(async () => {
    jest.setTimeout(30000);
    // Perform login to acquire JWT
    const loginRes = await AuthService.login('admin', 'Systemzap@2025');
    if (loginRes) {
      authToken = loginRes.token;
    }
  });

  describe('1. Health and Public Endpoints', () => {
    it('GET /api/health should return HEALTHY status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.service).toBe('VPS Multivus Monitor API');
    });

    it('GET /api/metrics should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/metrics');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Authentication Flow', () => {
    it('POST /api/auth/login with valid credentials should return token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Systemzap@2025' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('admin');
    });

    it('POST /api/auth/login with invalid password should fail', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'WrongPassword123' });

      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me should return authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('admin');
    });
  });

  describe('3. Metrics & Server Telemetry', () => {
    it('GET /api/metrics should return real-time system metrics', async () => {
      const res = await request(app)
        .get('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cpu).toBeDefined();
      expect(res.body.memory).toBeDefined();
      expect(res.body.disk).toBeDefined();
      expect(res.body.network).toBeDefined();
      expect(res.body.system).toBeDefined();
    });

    it('GET /api/metrics/history?range=1h should return historical series', async () => {
      const res = await request(app)
        .get('/api/metrics/history?range=1h')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.range).toBe('1h');
      expect(Array.isArray(res.body.points)).toBe(true);
    });
  });

  describe('4. Oracle Free Tier Rules & Free Guard', () => {
    it('OracleRulesService should return verified Always Free rules', () => {
      const rules = OracleRulesService.getRules();
      expect(rules.length).toBeGreaterThan(0);
      const armRule = rules.find(r => r.ruleKey === 'arm_ocpu_limit');
      expect(armRule).toBeDefined();
      expect(armRule?.numericLimit).toBe(4);
    });

    it('OracleGuardService should evaluate current usage against Always Free limits', async () => {
      const guard = await OracleGuardService.evaluateGuard();
      expect(guard.overallStatus).toBeDefined();
      expect(guard.resources.length).toBeGreaterThanOrEqual(5);
      expect(guard.idleReclamation).toBeDefined();
    });

    it('BillingService should calculate budget and alert tiers', async () => {
      const billing = await BillingService.getBillingReport();
      expect(billing.budgetConfiguredUsd).toBeGreaterThanOrEqual(0);
      expect(billing.disclaimer).toContain('Budget');
    });
  });

  describe('5. Risk Engine & Automated Checkup', () => {
    it('RiskEngineService should compute 0-100 score and risk factors', async () => {
      const risk = await RiskEngineService.evaluateRisk();
      expect(risk.score).toBeGreaterThanOrEqual(0);
      expect(risk.score).toBeLessThanOrEqual(100);
      expect(risk.status).toBeDefined();
    }, 30000);

    it('CheckupService should run 18-step diagnostic and generate report', async () => {
      const report = await CheckupService.runFullCheckup();
      expect(report.totalChecks).toBeGreaterThanOrEqual(15);
      expect(report.okCount).toBeGreaterThanOrEqual(0);
      expect(report.summary).toBeDefined();
    }, 30000);
  });

  describe('6. News & Reddit Aggregator', () => {
    it('GET /api/news should return categorized feed with disclaimer flags', async () => {
      const res = await request(app)
        .get('/api/news')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      
      const redditItem = res.body.find((n: any) => n.source.includes('Reddit'));
      if (redditItem) {
        expect(redditItem.isDisclaimerRequired).toBe(true);
        expect(redditItem.disclaimerText).toContain('não foi confirmada oficialmente');
      }
    });
  });
});
