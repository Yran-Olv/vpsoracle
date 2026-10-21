import React, { useState, useEffect } from 'react';
import { useMetrics } from '../context/MetricsContext';
import { useServer } from '../context/ServerContext';
import { OciInstanceCard } from '../components/OracleFreeGuard/OciInstanceCard';
import { OracleFreeGuardCard } from '../components/OracleFreeGuard/OracleFreeGuardCard';
import { RiskScoreCard } from '../components/RiskEngine/RiskScoreCard';
import { ServerSummaryCards } from '../components/ServerMetrics/ServerSummaryCards';
import { ContainersTable } from '../components/Docker/ContainersTable';
import { ServicesGrid } from '../components/Services/ServicesGrid';
import { DomainsList } from '../components/Domains/DomainsList';
import { BillingProtectionCard } from '../components/Billing/BillingProtectionCard';
import { NewsFeedList } from '../components/News/NewsFeedList';
import { 
  oracleApi, 
  riskApi, 
  dockerApi, 
  servicesApi, 
  domainsApi, 
  newsApi 
} from '../services/api';
import { 
  OracleFreeGuardReport, 
  OciInstanceMetadata,
  FreeTierRiskReport, 
  DockerOverview, 
  SystemService, 
  MonitoredDomain, 
  BillingProtectionReport, 
  NewsItem 
} from '../types';
import { 
  Server, 
  Layers, 
  Container, 
  ShieldCheck, 
  Activity, 
  AlertCircle, 
  Info,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { metrics, isLoading: isMetricsLoading, refreshMetrics } = useMetrics();
  const { servers, activeServer, activeServerId, setActiveServerId } = useServer();

  const [guard, setGuard] = useState<OracleFreeGuardReport | null>(null);
  const [instance, setInstance] = useState<OciInstanceMetadata | null>(null);
  const [risk, setRisk] = useState<FreeTierRiskReport | null>(null);
  const [billing, setBilling] = useState<BillingProtectionReport | null>(null);
  const [docker, setDocker] = useState<DockerOverview | null>(null);
  const [services, setServices] = useState<SystemService[]>([]);
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsFilter, setNewsFilter] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [newsSort, setNewsSort] = useState<'newest' | 'relevance'>('newest');

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isOracleServer = activeServer?.provider === 'oracle' || (activeServerId === 1 && !activeServer);

  const fetchDashboardData = async () => {
    try {
      const promises: Promise<any>[] = [
        dockerApi.getOverview(activeServerId).catch(() => null),
        servicesApi.getAll(activeServerId).catch(() => []),
        domainsApi.getAll().catch(() => []),
        newsApi.getAll(newsFilter, newsSort).catch(() => [])
      ];

      // Only fetch Oracle-specific endpoints if server is oracle
      if (isOracleServer && activeServerId !== 'all') {
        promises.push(
          oracleApi.getFreeGuard().catch(() => null),
          oracleApi.getInstance().catch(() => null),
          riskApi.getReport().catch(() => null),
          oracleApi.getBilling().catch(() => null)
        );
      }

      const results = await Promise.all(promises);

      const dockerRes = results[0];
      const servicesRes = results[1];
      const domainsRes = results[2];
      const newsRes = results[3];

      if (dockerRes) setDocker(dockerRes);
      if (servicesRes) setServices(servicesRes);
      if (domainsRes) setDomains(domainsRes);
      if (newsRes) setNews(newsRes);

      if (isOracleServer && activeServerId !== 'all') {
        const guardRes = results[4];
        const instanceRes = results[5];
        const riskRes = results[6];
        const billingRes = results[7];

        if (guardRes) {
          setGuard(guardRes);
          if (guardRes.instance) setInstance(guardRes.instance);
        }
        if (instanceRes) setInstance(instanceRes);
        if (riskRes) setRisk(riskRes);
        if (billingRes) setBilling(billingRes);
      } else {
        setGuard(null);
        setInstance(null);
        setRisk(null);
        setBilling(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [activeServerId, newsFilter, newsSort]);

  // If "all" is selected, render Consolidated Fleet Dashboard
  if (activeServerId === 'all') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-8">
        {/* Fleet Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Visão Consolidada da Frota
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {servers.length} Servidores
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Métricas agregadas, inventário de nós VPS e monitoramento global de containers e domínios.
            </p>
          </div>
        </div>

        {/* Fleet KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instâncias na Frota</div>
            <div className="text-2xl font-extrabold text-white font-mono">{servers.length}</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {servers.filter(s => s.status === 'active').length} ativas
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Containers Docker</div>
            <div className="text-2xl font-extrabold text-blue-400 font-mono">
              {docker?.total || 0}
            </div>
            <div className="text-[10px] text-slate-400">
              {docker?.running || 0} em execução
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Média de CPU (Nós Ativos)</div>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">
              {metrics?.cpu.usagePercent.toFixed(1) || '0.0'}%
            </div>
            <div className="text-[10px] text-slate-400">
              Carga agregada ponderada
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Média de Memória RAM</div>
            <div className="text-2xl font-extrabold text-purple-400 font-mono">
              {metrics?.memory.usagePercent.toFixed(1) || '0.0'}%
            </div>
            <div className="text-[10px] text-slate-400">
              Utilização média da frota
            </div>
          </div>
        </div>

        {/* Fleet Nodes Grid */}
        <div className="rounded-2xl glass-card border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" /> Nós da Frota Multivus
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Clique para inspecionar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {servers.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveServerId(s.id)}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/50 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white group-hover:text-blue-400 transition-colors truncate">
                      {s.name}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{s.ip_address}</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="capitalize">{s.provider}</span>
                    <span>•</span>
                    <span className="uppercase">{s.environment}</span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Docker Containers (Fleet) */}
        <ContainersTable
          docker={docker}
          isLoading={isLoading}
          onRefresh={fetchDashboardData}
        />

        {/* System Services & Domains Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ServicesGrid
            services={services}
            isLoading={isLoading}
            onRefresh={fetchDashboardData}
          />
          <DomainsList
            domains={domains}
            isLoading={isLoading}
            onRefresh={fetchDashboardData}
          />
        </div>

        {/* Oracle & Reddit News */}
        <NewsFeedList
          news={news}
          isLoading={isLoading}
          onRefresh={fetchDashboardData}
          activeFilter={newsFilter}
          onFilterChange={setNewsFilter}
          activeSort={newsSort}
          onSortChange={setNewsSort}
        />
      </div>
    );
  }

  // Single Server View
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* If server is NOT Oracle, show an informative card instead of misleading Oracle cards */}
      {!isOracleServer ? (
        <div className="p-4 rounded-2xl glass-card border border-blue-500/20 bg-blue-950/10 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-blue-300">
              Servidor {activeServer?.name} ({activeServer?.provider.toUpperCase()})
            </h4>
            <p className="text-[11px] text-slate-300">
              O módulo <strong className="text-white">Oracle Free Guard</strong> é exclusivo para servidores hospedados na Oracle Cloud Infrastructure (OCI). Como esta VPS é do tipo <strong>{activeServer?.provider}</strong>, as cotas Always Free não são monitoradas para ela.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Real OCI Instance Metadata Card */}
          <OciInstanceCard instance={instance} isLoading={isLoading} />

          {/* 2. Oracle Free Guard - Heart of the system */}
          <OracleFreeGuardCard guard={guard} isLoading={isLoading} />

          {/* 3. Free Tier Risk Engine */}
          <RiskScoreCard riskReport={risk} isLoading={isLoading} />
        </>
      )}

      {/* Server Health Telemetry */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pl-1">
          Telemetria do Servidor {activeServer?.name || 'VPS'}
        </h3>
        <ServerSummaryCards metrics={metrics} isLoading={isMetricsLoading} />
      </div>

      {/* Billing Protection (Oracle only) */}
      {isOracleServer && (
        <BillingProtectionCard
          billing={billing}
          isLoading={isLoading}
          onBudgetUpdated={fetchDashboardData}
        />
      )}

      {/* Docker Containers */}
      <ContainersTable
        docker={docker}
        isLoading={isLoading}
        onRefresh={fetchDashboardData}
      />

      {/* System Services & Domains Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServicesGrid
          services={services}
          isLoading={isLoading}
          onRefresh={fetchDashboardData}
        />
        <DomainsList
          domains={domains}
          isLoading={isLoading}
          onRefresh={fetchDashboardData}
        />
      </div>

      {/* Oracle Free Tier & Reddit News */}
      <NewsFeedList
        news={news}
        isLoading={isLoading}
        onRefresh={fetchDashboardData}
        activeFilter={newsFilter}
        onFilterChange={setNewsFilter}
        activeSort={newsSort}
        onSortChange={setNewsSort}
      />
    </div>
  );
};
