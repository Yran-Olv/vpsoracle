export interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator' | 'viewer' | string;
  email?: string;
  status?: 'active' | 'disabled';
  created_at?: string;
}

export interface ServerItem {
  id: number;
  name: string;
  hostname?: string;
  ip_address: string;
  port: number;
  provider: 'oracle' | 'generic' | 'aws' | 'hetzner' | 'digitalocean' | 'other';
  environment: 'production' | 'staging' | 'backup' | 'development';
  connection_type: 'local' | 'agent' | 'ssh';
  status: 'active' | 'disabled' | 'pending';
  is_default: number | boolean;
  os_info?: string;
  agent_version?: string;
  last_seen_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserItem {
  id: number;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'disabled';
  created_at?: string;
  last_login?: string;
}

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usagePercent: number;
    userPercent: number;
    systemPercent: number;
    cores: number;
    model: string;
    speed: number;
    load1m: number;
    load5m: number;
    load15m: number;
    temperature: number | null;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    availableBytes: number;
    usagePercent: number;
    swapTotalBytes: number;
    swapUsedBytes: number;
    swapUsagePercent: number;
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usagePercent: number;
    readBytesSec: number;
    writeBytesSec: number;
    iops: number;
    mounts: Array<{
      fs: string;
      type: string;
      size: number;
      used: number;
      available: number;
      usePercent: number;
      mount: string;
    }>;
  };
  network: {
    rxBytesSec: number;
    txBytesSec: number;
    totalRxBytes: number;
    totalTxBytes: number;
    interfaces: Array<{
      iface: string;
      ip4: string;
      rxBytes: number;
      txBytes: number;
      rxSec: number;
      txSec: number;
    }>;
  };
  system: {
    uptimeSeconds: number;
    processCount: number;
    hostname: string;
    platform: string;
    distro: string;
    kernel: string;
    arch: string;
  };
}

export interface MetricHistoryPoint {
  time: number;
  cpu: number;
  memory: number;
  disk: number;
  diskReadSec: number;
  diskWriteSec: number;
  iops: number;
  netRxSec: number;
  netTxSec: number;
  load1m: number;
}

export interface MetricStatsSummary {
  cpu: { min: number; max: number; avg: number; current: number };
  memory: { min: number; max: number; avg: number; current: number };
  disk: { min: number; max: number; avg: number; current: number };
  network: { maxRx: number; maxTx: number; avgRx: number; avgTx: number };
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  version: string;
  status: 'running' | 'stopped' | 'restarting' | 'paused' | 'dead';
  stateString: string;
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  restartCount: number;
  uptime: string;
  ports: Array<{ hostPort: string; containerPort: string; protocol: string }>;
  mounts: Array<{ source: string; destination: string; mode: string }>;
}

export interface DockerOverview {
  available: boolean;
  total: number;
  running: number;
  stopped: number;
  unhealthy: number;
  containers: DockerContainer[];
}

export interface SystemService {
  name: string;
  label: string;
  category: 'web' | 'database' | 'system' | 'security' | 'runtime';
  status: 'running' | 'warning' | 'down';
  description: string;
  memoryMb?: number;
  cpuPercent?: number;
  pids?: number[];
}

export interface MonitoredDomain {
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

export interface ResourceGuardItem {
  id: string;
  name: string;
  category: 'compute' | 'storage' | 'network' | 'policy';
  currentUsage: number;
  limit: number;
  unit: string;
  formattedCurrent: string;
  formattedLimit: string;
  usagePercent: number;
  remainingMargin: string;
  status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO';
  statusColor: 'green' | 'yellow' | 'orange' | 'red';
  statusBadge: string;
  details: string;
  isOfficialRule: boolean;
}

export interface OciInstanceMetadata {
  displayName: string;
  id: string; // OCID
  shape: string;
  ocpus: number;
  memoryInGBs: number;
  networkingBandwidthInGbps: number;
  availabilityDomain: string;
  faultDomain: string;
  region: string;
  regionKey: string;
  canonicalRegionName: string;
  state: string;
  timeCreated: number;
  createdFormatted: string;
  compartmentId: string;
  image: string;
  privateIp: string;
  publicIp: string;
  vnicId: string;
  macAddr: string;
  isAlwaysFreeEligible: boolean;
  tenancyLimits: {
    maxArmOcpu: number;
    maxArmRamGb: number;
    maxStorageGb: number;
    maxBandwidthTb: number;
    maxPublicIps: number;
  };
  tenancyAllocated: {
    usedOcpu: number;
    usedRamGb: number;
    percentOcpu: number;
    percentRam: number;
    availableOcpu: number;
    availableRamGb: number;
  };
  isFromLiveImds: boolean;
  imdsStatus?: 'ONLINE' | 'STALE' | 'OFFLINE';
  lastValidFetchAt?: string;
  fetchedAt: string;
}

export interface OracleFreeGuardReport {
  overallStatus: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO';
  overallStatusBadge: string;
  overallScore: number;
  instance?: OciInstanceMetadata;
  resources: ResourceGuardItem[];
  idleReclamation: {
    status: 'SEGURO' | 'ATENÇÃO' | 'RISCO';
    cpu95thPercentile: number;
    ram95thPercentile: number;
    network95thPercentile: number;
    thresholdPercent: number;
    evaluationWindowDays: number;
    isAtRisk: boolean;
    warningMessage: string | null;
  };
  lastEvaluatedAt: string;
}

export interface OracleRule {
  id: number;
  category: 'compute' | 'storage' | 'network' | 'database' | 'idle_policy' | 'security';
  ruleKey: string;
  label: string;
  officialValue: string;
  officialUnit: string;
  numericLimit: number;
  classification: 'Oficial' | 'Comunidade' | 'Não Confirmado';
  source: string;
  sourceUrl: string;
  notes: string;
  verifiedAt: string;
}

export interface OracleRuleChange {
  id: number;
  ruleKey: string;
  ruleLabel: string;
  oldValue: string;
  newValue: string;
  sourceUrl: string;
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  impactDescription: string;
  detectedAt: string;
  isAlerted: boolean;
}

export interface NewsItem {
  id: number;
  title: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  summary: string;
  classification: 'Oficial' | 'Comunidade' | 'Relato de Usuário' | 'Possível Risco';
  classificationBadge: string;
  score: number;
  isDisclaimerRequired: boolean;
  disclaimerText?: string;
  tags: string[];
}

export interface BillingProtectionReport {
  budgetConfiguredUsd: number;
  currentEstimatedCostUsd: number;
  projectedMonthEndCostUsd: number;
  budgetUtilizationPercent: number;
  currentBillingPeriod: string;
  currency: string;
  status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO';
  statusBadge: string;
  alertTier: '0%' | '25%' | '50%' | '75%' | '90%' | '100%';
  alertTierColor: 'green' | 'yellow' | 'orange' | 'red';
  disclaimer: string;
  isOciCostApiConfigured?: boolean;
  confirmedCostUsd?: number | null;
  costPillars?: {
    confirmed: {
      amount: number | null;
      statusText: string;
      isAvailable: boolean;
      note: string;
    };
    estimated: {
      amount: number;
      period: string;
      assumption: string;
    };
    billingRisk: {
      level: 'BAIXO' | 'MÉDIO' | 'ALTO';
      confidence: 'ALTA' | 'MÉDIA' | 'BAIXA';
      evidenceSource: string;
      details: string;
    };
  };
  potentiallyChargeableResources: Array<{
    name: string;
    description: string;
    isAlwaysFreeEligible: boolean;
    currentCostUsd: number;
    riskLevel: 'None' | 'Low' | 'Medium' | 'High';
  }>;
  recommendations: string[];
}

export interface RiskFactor {
  id: string;
  category: 'storage' | 'compute' | 'docker' | 'services' | 'ssl' | 'billing' | 'idle_policy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  whatHappened: string;
  whyItMatters: string;
  whatToDo: string;
  scoreContribution: number;
}

export interface FreeTierRiskReport {
  score: number;
  status: 'SEGURO' | 'ATENÇÃO' | 'RISCO' | 'CRÍTICO';
  statusBadge: string;
  statusColor: 'green' | 'yellow' | 'orange' | 'red';
  summary: string;
  riskFactors: RiskFactor[];
  evaluatedAt: string;
}

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

export interface AlertConfig {
  id: number;
  metricKey: string;
  label: string;
  operator: 'gt' | 'lt' | 'eq';
  thresholdValue: number;
  severity: 'info' | 'warning' | 'critical';
  isEnabled: boolean;
}

export interface AlertHistory {
  id: number;
  alertKey: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  triggeredAt: string;
  resolvedAt: string | null;
  isAcknowledged: boolean;
}

export interface Incident {
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
