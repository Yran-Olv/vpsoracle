import React from 'react';
import { SystemService } from '../../types';
import { Layers, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Cpu, Database, Shield, Globe } from 'lucide-react';

interface ServicesGridProps {
  services: SystemService[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export const ServicesGrid: React.FC<ServicesGridProps> = ({ services, isLoading, onRefresh }) => {
  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl glass-card animate-pulse space-y-4">
        <div className="h-6 w-36 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-slate-800/60 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const getServiceCategoryIcon = (category: string) => {
    switch (category) {
      case 'web':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'database':
        return <Database className="w-4 h-4 text-purple-400" />;
      case 'security':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      default:
        return <Layers className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/10 border border-indigo-500/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
              Serviços do Sistema
            </h2>
            <p className="text-xs text-slate-400">
              Monitoramento automático de systemd, daemons e proxies reversos
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

      {/* Grid of Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => {
          const isRunning = s.status === 'running';
          const isWarning = s.status === 'warning';
          return (
            <div
              key={s.name}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-800/80">
                    {getServiceCategoryIcon(s.category)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{s.label}</h3>
                    <span className="text-[10px] text-slate-500 font-mono capitalize">{s.category}</span>
                  </div>
                </div>

                <div>
                  {isRunning && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Running
                    </span>
                  )}
                  {isWarning && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Warning
                    </span>
                  )}
                  {s.status === 'down' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Down
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2">
                {s.description}
              </p>

              {(s.memoryMb !== undefined && s.memoryMb > 0) && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Consumo:</span>
                  <span className="text-slate-200 font-semibold">{s.memoryMb} MB RAM • {s.cpuPercent}% CPU</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
