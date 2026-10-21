import React from 'react';
import { useMetrics } from '../context/MetricsContext';
import { ServerSummaryCards } from '../components/ServerMetrics/ServerSummaryCards';
import { MetricCharts } from '../components/ServerMetrics/MetricCharts';
import { Server, HardDrive, Cpu, Terminal, Layers } from 'lucide-react';

export const ServerPage: React.FC = () => {
  const { metrics, isLoading } = useMetrics();

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <Server className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Servidor VPS Oracle</h1>
          <p className="text-xs text-slate-400 font-mono">
            Host: {metrics?.system.hostname} • Linux {metrics?.system.kernel} ({metrics?.system.arch})
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <ServerSummaryCards metrics={metrics} isLoading={isLoading} />

      {/* Historical Telemetry Charts */}
      <MetricCharts />

      {/* Mount Points & Filesystem Breakdown */}
      {metrics && metrics.disk.mounts && (
        <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Pontos de Montagem & Filesystem</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.disk.mounts.map((m, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{m.mount}</span>
                  <span className="text-slate-400">{m.fs} ({m.type})</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Ocupado: {formatBytes(m.used)} ({m.usePercent}%)</span>
                  <span className="text-emerald-400">Livre: {formatBytes(m.available)}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      m.usePercent > 90 ? 'bg-red-500' : m.usePercent > 75 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${m.usePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
