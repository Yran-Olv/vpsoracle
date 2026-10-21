import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import { initDatabase } from './database';
import { apiLimiter } from './middleware/rateLimit.middleware';
import apiRouter from './routes';
import { startBackgroundJobs } from './jobs';
import { MetricsService } from './services/metrics.service';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api', apiRouter);

// Server-Sent Events (SSE) for Realtime Dashboard Streaming (Protected with JWT & supports serverId)
app.get('/events', authMiddleware, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const serverIdParam = req.query.serverId ? String(req.query.serverId) : '1';
  const serverId = parseInt(serverIdParam, 10) || 1;

  // Send initial metrics immediately
  try {
    const initialMetrics = await MetricsService.collectMetrics(false, serverId);
    res.write(`data: ${JSON.stringify({ type: 'metrics', serverId, data: initialMetrics })}\n\n`);
  } catch (err) {}

  // Stream metrics every 5 seconds
  const intervalId = setInterval(async () => {
    try {
      const metrics = await MetricsService.collectMetrics(false, serverId);
      res.write(`data: ${JSON.stringify({ type: 'metrics', serverId, data: metrics })}\n\n`);
    } catch (e) {}
  }, 5000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

// Serve frontend static build if present
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/events')) {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('VPS Multivus API Server Running. Build frontend to view dashboard.');
    }
  });
});

// Initialize database & Start Server
initDatabase();

if (config.env === 'production') {
  const weakSecrets = [
    'vps-multivus-oracle-2026-safe-token-multivus-secret',
    'vps-multivus-secret-key-oracle-2026-safe-token',
    'secret',
    'admin',
    '123456'
  ];
  if (!config.jwtSecret || config.jwtSecret.length < 20 || weakSecrets.includes(config.jwtSecret)) {
    console.warn('⚠️ [AVISO DE SEGURANÇA]: O JWT_SECRET configurado é padrão ou possui baixa entropia. Recomenda-se gerar um JWT_SECRET exclusivo e seguro no arquivo .env.');
  }
}

if (process.env.NODE_ENV !== 'test') {
  startBackgroundJobs();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(`🚀 VPS Multivus Backend Server Running`);
    console.log(`📍 Port: ${config.port}`);
    console.log(`🌐 Target: http://localhost:${config.port}`);
    console.log(`🔒 Timezone: ${config.timezone}`);
    console.log(`🛡️ SSE /events: Autenticado com JWT via Bearer/Query Token`);
    console.log(`==================================================`);
  });
}

export default app;
