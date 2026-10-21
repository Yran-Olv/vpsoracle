import React, { useState, useEffect } from 'react';
import { ContainersTable } from '../components/Docker/ContainersTable';
import { dockerApi } from '../services/api';
import { DockerOverview } from '../types';
import { Container, RefreshCw } from 'lucide-react';

export const DockerPage: React.FC = () => {
  const [docker, setDocker] = useState<DockerOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDocker = async () => {
    setIsLoading(true);
    try {
      const data = await dockerApi.getOverview();
      setDocker(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocker();
    const interval = setInterval(fetchDocker, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
          <Container className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Docker Engine & Containers</h1>
          <p className="text-xs text-slate-400 font-mono">
            Integração nativa com socket /var/run/docker.sock
          </p>
        </div>
      </div>

      <ContainersTable docker={docker} isLoading={isLoading} onRefresh={fetchDocker} />
    </div>
  );
};
