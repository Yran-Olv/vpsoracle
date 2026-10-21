import React, { useState } from 'react';
import { DockerOverview, DockerContainer } from '../../types';
import { 
  Container, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal, 
  Layers, 
  RefreshCw 
} from 'lucide-react';
import { ContainerLogsModal } from './ContainerLogsModal';

interface ContainersTableProps {
  docker: DockerOverview | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

export const ContainersTable: React.FC<ContainersTableProps> = ({ docker, isLoading, onRefresh }) => {
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);

  if (isLoading || !docker) {
    return (
      <div className="p-6 rounded-2xl glass-card animate-pulse space-y-4">
        <div className="h-6 w-36 bg-slate-800 rounded"></div>
        <div className="h-40 bg-slate-800/60 rounded-xl"></div>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  };

  return (
    <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-sky-500/10 border border-blue-500/30 flex items-center justify-center">
            <Container className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                Containers Docker
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {docker.running} Ativos / {docker.total} Total
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gerenciamento em tempo real de containers, healthchecks, consumo e logs
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        )}
      </div>

      {!docker.available ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
          Docker daemon não detectado no socket /var/run/docker.sock.
        </div>
      ) : docker.containers.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
          Nenhum container Docker em execução no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docker.containers.map((c) => {
            const isRunning = c.status === 'running';
            return (
              <div
                key={c.id}
                onClick={() => setSelectedContainer(c)}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all cursor-pointer space-y-3 group"
              >
                {/* Card Top */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                        {c.name}
                      </h3>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                      {c.image}
                    </div>
                  </div>

                  {/* Health badge */}
                  <div>
                    {c.health === 'healthy' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Healthy
                      </span>
                    )}
                    {c.health === 'unhealthy' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Unhealthy
                      </span>
                    )}
                    {c.health === 'none' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isRunning ? 'bg-slate-800 text-slate-300' : 'bg-slate-900 text-slate-500'
                      }`}>
                        {c.stateString.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Resource Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] block">CPU</span>
                    <span className="text-white font-bold">{c.cpuPercent}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] block">RAM</span>
                    <span className="text-white font-bold">{formatBytes(c.memoryUsageBytes)}</span>
                  </div>
                </div>

                {/* Footer with ports & log action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[10px] text-slate-400">
                  <span className="truncate max-w-[160px] font-mono">
                    {c.ports.length > 0 ? c.ports.map(p => p.hostPort ? `${p.hostPort}:${p.containerPort}` : p.containerPort).join(', ') : 'Portas internas'}
                  </span>
                  <span className="text-blue-400 flex items-center gap-1 font-semibold group-hover:underline">
                    <Terminal className="w-3 h-3" /> Ver Logs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logs Modal */}
      <ContainerLogsModal
        container={selectedContainer}
        isOpen={!!selectedContainer}
        onClose={() => setSelectedContainer(null)}
      />
    </div>
  );
};
