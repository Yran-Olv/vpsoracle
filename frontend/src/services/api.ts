import axios from 'axios';
import {
  User,
  SystemMetrics,
  MetricHistoryPoint,
  MetricStatsSummary,
  DockerOverview,
  SystemService,
  MonitoredDomain,
  OracleFreeGuardReport,
  OciInstanceMetadata,
  OracleRule,
  OracleRuleChange,
  NewsItem,
  BillingProtectionReport,
  FreeTierRiskReport,
  CheckupReport,
  AlertConfig,
  AlertHistory,
  Incident
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach Authorization Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vps_multivus_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('vps_multivus_token');
        localStorage.removeItem('vps_multivus_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },
  getMe: async (): Promise<{ user: User }> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  }
};

export const metricsApi = {
  getRealtime: async (): Promise<SystemMetrics> => {
    const res = await api.get('/metrics');
    return res.data;
  },
  getHistory: async (range: '1h' | '6h' | '24h' | '7d' | '30d'): Promise<{ range: string; summary: MetricStatsSummary; points: MetricHistoryPoint[] }> => {
    const res = await api.get(`/metrics/history?range=${range}`);
    return res.data;
  }
};

export const dockerApi = {
  getOverview: async (): Promise<DockerOverview> => {
    const res = await api.get('/docker');
    return res.data;
  },
  getLogs: async (containerId: string, lines = 100): Promise<{ id: string; logs: string }> => {
    const res = await api.get(`/docker/containers/${containerId}/logs?lines=${lines}`);
    return res.data;
  },
  inspect: async (containerId: string): Promise<any> => {
    const res = await api.get(`/docker/containers/${containerId}/inspect`);
    return res.data;
  }
};

export const servicesApi = {
  getAll: async (): Promise<SystemService[]> => {
    const res = await api.get('/services');
    return res.data;
  }
};

export const domainsApi = {
  getAll: async (): Promise<MonitoredDomain[]> => {
    const res = await api.get('/domains');
    return res.data;
  },
  add: async (domainName: string, targetUrl?: string): Promise<MonitoredDomain> => {
    const res = await api.post('/domains', { domainName, targetUrl });
    return res.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete(`/domains/${id}`);
    return res.data;
  },
  check: async (id: number): Promise<MonitoredDomain> => {
    const res = await api.post(`/domains/${id}/check`);
    return res.data;
  }
};

export const oracleApi = {
  getInstance: async (): Promise<OciInstanceMetadata> => {
    const res = await api.get('/oracle/instance');
    return res.data;
  },
  getFreeGuard: async (): Promise<OracleFreeGuardReport> => {
    const res = await api.get('/oracle/free-tier');
    return res.data;
  },
  getRules: async (): Promise<OracleRule[]> => {
    const res = await api.get('/oracle/rules');
    return res.data;
  },
  refreshRules: async (): Promise<{ checked: boolean; updatedCount: number; message: string; rules: OracleRule[] }> => {
    const res = await api.post('/oracle/rules/refresh');
    return res.data;
  },
  getChanges: async (): Promise<OracleRuleChange[]> => {
    const res = await api.get('/oracle/changes');
    return res.data;
  },
  getBilling: async (): Promise<BillingProtectionReport> => {
    const res = await api.get('/oracle/billing');
    return res.data;
  },
  updateBudget: async (budgetUsd: number): Promise<{ message: string; budgetUsd: number }> => {
    const res = await api.post('/oracle/billing/budget', { budgetUsd });
    return res.data;
  }
};

export const newsApi = {
  getAll: async (filter: 'today' | '7d' | '30d' | 'all' = 'all', sort: 'newest' | 'relevance' = 'newest'): Promise<NewsItem[]> => {
    const res = await api.get(`/news?filter=${filter}&sort=${sort}`);
    return res.data;
  },
  getReddit: async (filter: 'today' | '7d' | '30d' | 'all' = 'all', sort: 'newest' | 'relevance' = 'newest'): Promise<NewsItem[]> => {
    const res = await api.get(`/news/reddit?filter=${filter}&sort=${sort}`);
    return res.data;
  },
  refresh: async (): Promise<{ message: string; fetched: number; newItems: number }> => {
    const res = await api.post('/news/refresh');
    return res.data;
  }
};

export const riskApi = {
  getReport: async (): Promise<FreeTierRiskReport> => {
    const res = await api.get('/risk');
    return res.data;
  }
};

export const checkupApi = {
  runCheckup: async (): Promise<CheckupReport> => {
    const res = await api.post('/checkup');
    return res.data;
  },
  getLatest: async (): Promise<CheckupReport> => {
    const res = await api.get('/checkup/latest');
    return res.data;
  }
};

export const alertsApi = {
  getConfigs: async (): Promise<AlertConfig[]> => {
    const res = await api.get('/alerts');
    return res.data;
  },
  updateConfig: async (id: number, thresholdValue: number, severity: string, isEnabled: boolean): Promise<{ message: string }> => {
    const res = await api.put(`/alerts/${id}`, { thresholdValue, severity, isEnabled });
    return res.data;
  },
  getHistory: async (limit = 50): Promise<AlertHistory[]> => {
    const res = await api.get(`/alerts/history?limit=${limit}`);
    return res.data;
  },
  acknowledge: async (id: number): Promise<{ message: string }> => {
    const res = await api.post(`/alerts/history/${id}/ack`);
    return res.data;
  },
  getIncidents: async (limit = 50): Promise<Incident[]> => {
    const res = await api.get(`/incidents?limit=${limit}`);
    return res.data;
  }
};

export const settingsApi = {
  get: async (): Promise<Record<string, string>> => {
    const res = await api.get('/settings');
    return res.data;
  },
  save: async (settings: Record<string, string>): Promise<{ message: string }> => {
    const res = await api.post('/settings', settings);
    return res.data;
  }
};

export const reportApi = {
  downloadMarkdown: () => {
    const token = localStorage.getItem('vps_multivus_token');
    window.open(`/api/report/markdown?token=${token}`, '_blank');
  },
  getJSON: async (): Promise<{ markdown: string }> => {
    const res = await api.get('/report/json');
    return res.data;
  }
};

export default api;
