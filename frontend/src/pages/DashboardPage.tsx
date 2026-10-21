import React, { useState, useEffect } from 'react';
import { useMetrics } from '../context/MetricsContext';
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

export const DashboardPage: React.FC = () => {
  const { metrics, isLoading: isMetricsLoading, refreshMetrics } = useMetrics();

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

  const fetchDashboardData = async () => {
    try {
      const [
        guardRes,
        instanceRes,
        riskRes,
        billingRes,
        dockerRes,
        servicesRes,
        domainsRes,
        newsRes
      ] = await Promise.all([
        oracleApi.getFreeGuard().catch(() => null),
        oracleApi.getInstance().catch(() => null),
        riskApi.getReport().catch(() => null),
        oracleApi.getBilling().catch(() => null),
        dockerApi.getOverview().catch(() => null),
        servicesApi.getAll().catch(() => []),
        domainsApi.getAll().catch(() => []),
        newsApi.getAll(newsFilter, newsSort).catch(() => [])
      ]);

      if (guardRes) {
        setGuard(guardRes);
        if (guardRes.instance) setInstance(guardRes.instance);
      }
      if (instanceRes) setInstance(instanceRes);
      if (riskRes) setRisk(riskRes);
      if (billingRes) setBilling(billingRes);
      if (dockerRes) setDocker(dockerRes);
      if (servicesRes) setServices(servicesRes);
      if (domainsRes) setDomains(domainsRes);
      if (newsRes) setNews(newsRes);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [newsFilter, newsSort]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* 1. Real OCI Instance Metadata Card */}
      <OciInstanceCard instance={instance} isLoading={isLoading} />

      {/* 2. Oracle Free Guard - Heart of the system */}
      <OracleFreeGuardCard guard={guard} isLoading={isLoading} />

      {/* 3. Free Tier Risk Engine */}
      <RiskScoreCard riskReport={risk} isLoading={isLoading} />

      {/* 4. Server Health Telemetry */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pl-1">
          Telemetria do Servidor VPS
        </h3>
        <ServerSummaryCards metrics={metrics} isLoading={isMetricsLoading} />
      </div>

      {/* 5. Billing Protection */}
      <BillingProtectionCard
        billing={billing}
        isLoading={isLoading}
        onBudgetUpdated={fetchDashboardData}
      />

      {/* 6. Docker Containers */}
      <ContainersTable
        docker={docker}
        isLoading={isLoading}
        onRefresh={fetchDashboardData}
      />

      {/* 7. System Services & Domains Grid */}
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

      {/* 8. Oracle Free Tier & Reddit News */}
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
