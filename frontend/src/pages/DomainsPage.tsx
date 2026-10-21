import React, { useState, useEffect } from 'react';
import { DomainsList } from '../components/Domains/DomainsList';
import { domainsApi } from '../services/api';
import { MonitoredDomain } from '../types';
import { Globe } from 'lucide-react';

export const DomainsPage: React.FC = () => {
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const data = await domainsApi.getAll();
      setDomains(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
    const interval = setInterval(fetchDomains, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
          <Globe className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Domínios & Certificados SSL</h1>
          <p className="text-xs text-slate-400">
            Monitoramento de status HTTP, DNS e expiração de SSL Let's Encrypt / Cloudflare
          </p>
        </div>
      </div>

      <DomainsList domains={domains} isLoading={isLoading} onRefresh={fetchDomains} />
    </div>
  );
};
