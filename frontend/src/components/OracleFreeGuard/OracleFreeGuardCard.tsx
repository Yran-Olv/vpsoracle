import React from 'react';
import { OracleFreeGuardReport } from '../../types';
import { 
  ShieldAlert, 
  Cpu, 
  HardDrive, 
  Database, 
  Wifi, 
  Globe, 
  AlertTriangle,
  Info,
  ExternalLink
} from 'lucide-react';

interface OracleFreeGuardCardProps {
  guard: OracleFreeGuardReport | null;
  isLoading: boolean;
}

export const OracleFreeGuardCard: React.FC<OracleFreeGuardCardProps> = ({ guard, isLoading }) => {
  if (isLoading || !guard) {
    return (
      <div className="p-6 rounded-2xl glass-card animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-slate-800/60 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const getStatusColorClass = (color: string) => {
    switch (color) {
      case 'red':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'orange':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'yellow':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const getProgressBarColor = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-gradient-to-r from-red-600 to-rose-500';
      case 'orange':
        return 'bg-gradient-to-r from-orange-600 to-amber-500';
      case 'yellow':
        return 'bg-gradient-to-r from-amber-500 to-yellow-400';
      default:
        return 'bg-gradient-to-r from-emerald-500 to-teal-400';
    }
  };

  const getResourceIcon = (id: string) => {
    switch (id) {
      case 'ocpu':
        return <Cpu className="w-4 h-4 text-red-400" />;
      case 'ram':
        return <Database className="w-4 h-4 text-purple-400" />;
      case 'storage':
      case 'boot_volume':
        return <HardDrive className="w-4 h-4 text-blue-400" />;
      case 'network':
        return <Wifi className="w-4 h-4 text-cyan-400" />;
      case 'public_ip':
        return <Globe className="w-4 h-4 text-indigo-400" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 via-orange-500/20 to-amber-500/10 border border-red-500/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                Oracle Free Guard
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Regras Oficiais OCI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Monitoramento estrito de recursos contra limites Always Free para prevenção de cobranças
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${getStatusColorClass(
            guard.overallStatus === 'CRÍTICO' ? 'red' : guard.overallStatus === 'RISCO' ? 'orange' : guard.overallStatus === 'ATENÇÃO' ? 'yellow' : 'green'
          )}`}>
            <span>Status Geral:</span>
            <span>{guard.overallStatusBadge}</span>
          </div>
        </div>
      </div>

      {/* Grid of Resource Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {guard.resources.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-800/80">
                  {getResourceIcon(item.id)}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200">{item.name}</h3>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {item.formattedCurrent}
                  </div>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColorClass(item.statusColor)}`}>
                {item.statusBadge}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Utilização</span>
                <span className="text-white font-bold">{item.usagePercent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(item.statusColor)}`}
                  style={{ width: `${Math.min(100, Math.max(3, item.usagePercent))}%` }}
                />
              </div>
            </div>

            {/* Details and Margins */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Margem restante:</span>
              <span className="text-emerald-400 font-semibold font-mono">{item.remainingMargin}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Idle Instance Reclamation Watch Notice */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        guard.idleReclamation.isAtRisk 
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
          : 'bg-slate-900/40 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-xs font-bold flex items-center gap-2">
              <span>Política de Reclamação por Ociosidade (Oracle Idle Policy)</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                guard.idleReclamation.isAtRisk ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                P95 CPU: {guard.idleReclamation.cpu95thPercentile}% | RAM: {guard.idleReclamation.ram95thPercentile}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {guard.idleReclamation.warningMessage || 'Sua instância mantém atividade dentro da janela de 7 dias para evitar marcação como inativa pela Oracle.'}
            </p>
          </div>
        </div>

        <a
          href="https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm#compute__idleinstances"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0 font-medium"
        >
          <span>Doc Oracle</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
