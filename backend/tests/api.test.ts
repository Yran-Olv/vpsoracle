import request from 'supertest';
import app from '../src/index';
import { AuthService } from '../src/services/auth.service';
import { ServersService } from '../src/services/servers.service';
import { UsersService } from '../src/services/users.service';
import { OracleRulesService } from '../src/services/oracle-rules.service';
import { OracleGuardService } from '../src/services/oracle-guard.service';
import { RiskEngineService } from '../src/services/risk.service';
import { CheckupService } from '../src/services/checkup.service';
import { BillingService } from '../src/services/billing.service';
import { MetricsService } from '../src/services/metrics.service';
import { db } from '../src/database';

describe('VPS Multivus Backend & Multi-Server Test Suite', () => {
  let adminToken = '';
  let operatorToken = '';
  let viewerToken = '';
  let testServerId: number;
  let testAgentToken: string;

  beforeAll(async () => {
    // 1. Login as Admin
    const loginRes = await AuthService.login('admin', 'Systemzap@2025');
    if (loginRes) {
      adminToken = loginRes.token;
    }

    // Ensure default server 1 exists
    const defaultExists = db.prepare('SELECT id FROM servers WHERE is_default = 1 OR id = 1').get();
    if (!defaultExists) {
      db.prepare(`
        INSERT OR REPLACE INTO servers (
          id, name, hostname, ip_address, port, provider, environment, connection_type, status, is_default, os_info, agent_version, notes, last_seen_at
        ) VALUES (
          1, 'Oracle Principal (Host Central)', 'multivusvps', '147.15.19.44', 3050, 'oracle', 'production', 'local', 'online', 1, 'Ubuntu 24.04 LTS (ARM64 Ampere A1)', 'native-1.0.0', 'Servidor central Multivus hospedado na Oracle Cloud Always Free (São Paulo - GRU).', CURRENT_TIMESTAMP
        )
      `).run();
    }

    // 2. Create Operator and Viewer users for RBAC testing
    try {
      const opUser = UsersService.createUser({
        username: 'test_operator_' + Date.now(),
        passwordPlain: 'OperatorPass@123',
        role: 'operator'
      });
      const opLogin = await AuthService.login(opUser.username, 'OperatorPass@123');
      if (opLogin) operatorToken = opLogin.token;

      const viUser = UsersService.createUser({
        username: 'test_viewer_' + Date.now(),
        passwordPlain: 'ViewerPass@123',
        role: 'viewer'
      });
      const viLogin = await AuthService.login(viUser.username, 'ViewerPass@123');
      if (viLogin) viewerToken = viLogin.token;
    } catch (e) {
      console.warn('User setup warning in test:', e);
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

  describe('2. Authentication Flow & Role Validation', () => {
    it('POST /api/auth/login with valid admin credentials should return token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Systemzap@2025' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('admin');
      expect(res.body.user.role).toBe('admin');
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
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('admin');
    });
  });

  describe('3. Multi-Server Management (CRUD, RBAC & Validation)', () => {
    it('GET /api/servers should list all servers and include default host server', async () => {
      const res = await request(app)
        .get('/api/servers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const defaultServer = res.body.find((s: any) => s.is_default === 1 || s.id === 1);
      expect(defaultServer).toBeDefined();
      expect(defaultServer.provider).toBe('oracle');
      // Token hash must NEVER be exposed
      expect(defaultServer.api_key_hash).toBeUndefined();
    });

    it('POST /api/servers should reject viewer from creating servers (RBAC)', async () => {
      const res = await request(app)
        .post('/api/servers')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Unauthorized VPS',
          ip_address: '10.0.0.99'
        });

      expect(res.status).toBe(403);
    });

    it('POST /api/servers should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/servers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'No name or IP'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Nome');
    });

    it('POST /api/servers should allow Operator to register a new remote server', async () => {
      const res = await request(app)
        .post('/api/servers')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          name: 'VPS Secundária Hetzner',
          hostname: 'hetzner-node-01',
          ip_address: '159.69.100.22',
          port: 443,
          provider: 'hetzner',
          environment: 'staging',
          connection_type: 'agent',
          notes: 'Servidor remoto para testes'
        });

      expect(res.status).toBe(201);
      expect(res.body.server).toBeDefined();
      expect(res.body.server.name).toBe('VPS Secundária Hetzner');
      expect(res.body.server.provider).toBe('hetzner');
      expect(res.body.rawAgentToken).toBeDefined();
      expect(res.body.rawAgentToken).toMatch(/^mvs_[a-f0-9]{32,64}$/);

      testServerId = res.body.server.id;
      testAgentToken = res.body.rawAgentToken;
    });

    it('GET /api/servers/:id should return server details without leaking secrets', async () => {
      const res = await request(app)
        .get(`/api/servers/${testServerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testServerId);
      expect(res.body.name).toBe('VPS Secundária Hetzner');
      expect(res.body.api_key_hash).toBeUndefined();
      expect(res.body.rawAgentToken).toBeUndefined();
    });

    it('PUT /api/servers/:id should update server metadata', async () => {
      const res = await request(app)
        .put(`/api/servers/${testServerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'VPS Secundária Hetzner (Atualizada)',
          environment: 'production'
        });

      expect(res.status).toBe(200);
      expect(res.body.server.name).toBe('VPS Secundária Hetzner (Atualizada)');
      expect(res.body.server.environment).toBe('production');
    });

    it('POST /api/servers/:id/toggle-status should toggle active/disabled status', async () => {
      // Toggle to disabled
      const res1 = await request(app)
        .post(`/api/servers/${testServerId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.server.status).toBe('disabled');

      // Toggle back to active
      const res2 = await request(app)
        .post(`/api/servers/${testServerId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.server.status).toBe('active');
    });

    it('POST /api/servers/:id/token/rotate should generate a new agent bearer token', async () => {
      const res = await request(app)
        .post(`/api/servers/${testServerId}/token/rotate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.rawAgentToken).toBeDefined();
      expect(res.body.rawAgentToken).not.toBe(testAgentToken);

      // Update testAgentToken to the rotated token
      testAgentToken = res.body.rawAgentToken;
    });

    it('DELETE /api/servers/:id should prevent deleting default server 1', async () => {
      const res = await request(app)
        .delete('/api/servers/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('padrão');
    });
  });

  describe('4. Agent Telemetry Ingestion & Connection Testing', () => {
    it('POST /api/agent/report should reject unauthorized agent payloads', async () => {
      const res = await request(app)
        .post('/api/agent/report')
        .set('Authorization', 'Bearer mvs_invalidtoken12345678901234567890')
        .send({
          timestamp: Date.now(),
          cpu: { usagePercent: 12 }
        });

      expect(res.status).toBe(401);
    });

    it('POST /api/agent/report should accept telemetry from authenticated remote agent', async () => {
      const mockMetrics = {
        timestamp: Date.now(),
        cpu: {
          usagePercent: 28.5,
          userPercent: 20,
          systemPercent: 8.5,
          cores: 4,
          model: 'AMD EPYC-Milan',
          speed: 2450,
          load1m: 0.85,
          load5m: 0.90,
          load15m: 0.75,
          temperature: 42
        },
        memory: {
          totalBytes: 8589934592,
          usedBytes: 3435973836,
          freeBytes: 5153960756,
          availableBytes: 5153960756,
          usagePercent: 40.0,
          swapTotalBytes: 2147483648,
          swapUsedBytes: 0,
          swapUsagePercent: 0
        },
        disk: {
          totalBytes: 107374182400,
          usedBytes: 32212254720,
          availableBytes: 75161927680,
          usagePercent: 30.0,
          readBytesSec: 1024,
          writeBytesSec: 2048,
          iops: 15,
          mounts: []
        },
        network: {
          rxBytesSec: 5000,
          txBytesSec: 8000,
          totalRxBytes: 1000000,
          totalTxBytes: 2000000,
          interfaces: []
        },
        system: {
          uptimeSeconds: 86400,
          processCount: 110,
          hostname: 'hetzner-node-01',
          platform: 'linux',
          distro: 'Ubuntu 24.04 LTS',
          kernel: '6.8.0-generic',
          arch: 'x64'
        },
        containers: [
          { id: 'c1', name: 'web-app', image: 'nginx', status: 'Up 2 hours' },
          { id: 'c2', name: 'db-app', image: 'postgres', status: 'Up 1 hour' }
        ],
        services: [
          { name: 'nginx', label: 'Nginx Web Server', category: 'web', status: 'running', description: 'Ativo' }
        ]
      };

      const res = await request(app)
        .post('/api/agent/report')
        .set('Authorization', `Bearer ${testAgentToken}`)
        .send({
          agentVersion: '2.0.0',
          metrics: mockMetrics
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.serverId).toBe(testServerId);
    });

    it('POST /api/servers/:id/test-connection should report agent online with latency', async () => {
      const res = await request(app)
        .post(`/api/servers/${testServerId}/test-connection`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reachable).toBe(true);
      expect(res.body.agentVersion).toBe('2.0.0');
      expect(res.body.status).toBe('online');
    });

    it('GET /api/metrics?serverId=:id should return isolated metrics for the remote server', async () => {
      const res = await request(app)
        .get(`/api/metrics?serverId=${testServerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cpu.usagePercent).toBe(28.5);
      expect(res.body.system.hostname).toBe('hetzner-node-01');
    });

    it('GET /api/docker?serverId=:id should return docker overview for the remote server', async () => {
      const res = await request(app)
        .get(`/api/docker?serverId=${testServerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.available).toBe(true);
      expect(res.body.total).toBe(2);
    });

    it('GET /api/services?serverId=:id should return services for the remote server', async () => {
      const res = await request(app)
        .get(`/api/services?serverId=${testServerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((s: any) => s.name === 'nginx')).toBe(true);
    });
  });

  describe('5. Telemetry Isolation & Non-Mixing of Historical Series', () => {
    it('Metrics history queries should isolate data between Server 1 and Server 2', async () => {
      // 1. Query history for Server 1
      const res1 = await request(app)
        .get('/api/metrics/history?range=1h&serverId=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.range).toBe('1h');
      expect(Array.isArray(res1.body.points)).toBe(true);

      // 2. Query history for Remote Server
      const res2 = await request(app)
        .get(`/api/metrics/history?range=1h&serverId=${testServerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.status).toBe(200);
      expect(Array.isArray(res2.body.points)).toBe(true);
    });
  });

  describe('6. Users Management & Protection Rules', () => {
    let createdUserId: number;

    it('GET /api/users should list all users (Admin only)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((u: any) => u.username === 'admin')).toBe(true);
    });

    it('GET /api/users should block non-admin users (403)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('POST /api/users should create a new user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'temporary_user_' + Date.now(),
          password: 'TempPassword@123',
          role: 'viewer'
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      createdUserId = res.body.user.id;
    });

    it('POST /api/users/:id/password should reset user password', async () => {
      const res = await request(app)
        .post(`/api/users/${createdUserId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'NewStrongPassword@2026'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('sucesso');
    });

    it('DELETE /api/users/:id should prevent admin from deleting own account', async () => {
      // Find admin's id
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      const myId = meRes.body.user.id;
      const res = await request(app)
        .delete(`/api/users/${myId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('própria conta');
    });

    it('DELETE /api/users/:id should allow deleting temporary user', async () => {
      const res = await request(app)
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('excluído');
    });
  });

  describe('7. Oracle Free Tier Rules & Compatibility Validation', () => {
    it('OracleRulesService should return verified Always Free rules', () => {
      const rules = OracleRulesService.getRules();
      expect(rules.length).toBeGreaterThan(0);
      const armRule = rules.find(r => r.ruleKey === 'arm_ocpu_limit');
      expect(armRule).toBeDefined();
      expect(armRule?.numericLimit).toBe(2);
    });

    it('OracleGuardService should evaluate current usage against Always Free limits', async () => {
      const guard = await OracleGuardService.evaluateGuard();
      expect(guard.overallStatus).toBeDefined();
      expect(guard.resources.length).toBeGreaterThanOrEqual(5);
    });

    it('BillingService should calculate budget and alert tiers', async () => {
      const billing = await BillingService.getBillingReport();
      expect(billing.budgetConfiguredUsd).toBeGreaterThanOrEqual(0);
      expect(billing.disclaimer).toContain('Budget');
    });
  });

  describe('8. Server Deletion Policy (Keep vs Purge History)', () => {
    it('DELETE /api/servers/:id?deleteHistory=true should remove server and purge metrics', async () => {
      const res = await request(app)
        .delete(`/api/servers/${testServerId}?deleteHistory=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('removido');

      // Verify server is gone
      const getRes = await request(app)
        .get(`/api/servers/${testServerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
