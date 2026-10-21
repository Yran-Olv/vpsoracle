import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT || '3050', 10),
  jwtSecret: process.env.JWT_SECRET || 'vps-multivus-secret-key-oracle-2026-safe-token',
  jwtExpiresIn: '7d',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/vps_multivus.db'),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminInitialPassword: process.env.ADMIN_PASSWORD || 'Systemzap@2025',
  timezone: process.env.TIMEZONE || 'America/Sao_Paulo',
  metricsIntervalSeconds: parseInt(process.env.METRICS_INTERVAL_SEC || '10', 10),
  healthCheckIntervalSeconds: parseInt(process.env.HEALTHCHECK_INTERVAL_SEC || '30', 10),
  rawMetricsRetentionDays: parseInt(process.env.RAW_RETENTION_DAYS || '7', 10),
  hourlyMetricsRetentionDays: parseInt(process.env.HOURLY_RETENTION_DAYS || '90', 10),
  mainDomain: process.env.MAIN_DOMAIN || 'vps.multivus.com.br',
  
  // Oracle Cloud Always Free Official Baseline Rules (Novas Regras: 2 OCPUs / 12 GB RAM)
  oracleBaseline: {
    arm: {
      shape: 'VM.Standard.A1.Flex',
      maxOcpu: 2,
      maxRamGb: 12,
      monthlyOcpuHours: 1500,
      monthlyRamGbHours: 9000,
      minBootVolumeGb: 47,
    },
    amd: {
      shape: 'VM.Standard.E2.1.Micro',
      maxInstances: 2,
      ocpuPerInstance: 0.125, // 1/8 OCPU
      ramGbPerInstance: 1,
      minBootVolumeGb: 47,
    },
    storage: {
      totalBlockAndBootVolumeGb: 200,
      maxVolumeCount: 5,
      backupAlwaysFreeCount: 5,
    },
    network: {
      monthlyOutboundTransferTb: 10,
      ephemeralPublicIpv4Count: 2,
      reservedPublicIpv4Count: 1,
      flexibleLoadBalancerCount: 1,
      flexibleLoadBalancerBandwidthMbps: 10,
    },
    idleReclamation: {
      evaluationDays: 7,
      cpuPercentileThreshold: 20, // 95th percentile < 20%
      memoryPercentileThreshold: 20,
      networkPercentileThreshold: 20,
    }
  }
};
