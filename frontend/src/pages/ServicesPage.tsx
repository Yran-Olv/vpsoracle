import React, { useState, useEffect } from 'react';
import { ServicesGrid } from '../components/Services/ServicesGrid';
import { servicesApi } from '../services/api';
import { SystemService } from '../types';
import { Layers } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<SystemService[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const data = await servicesApi.getAll();
      setServices(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
          <Layers className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Serviços do Sistema</h1>
          <p className="text-xs text-slate-400">
            Nginx, Docker, PostgreSQL, Redis, PM2, SSH, UFW e Fail2ban
          </p>
        </div>
      </div>

      <ServicesGrid services={services} isLoading={isLoading} onRefresh={fetchServices} />
    </div>
  );
};
