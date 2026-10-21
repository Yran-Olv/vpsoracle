import React from 'react';
import { SystemMetrics } from '../../types';
import { Cpu, Database, HardDrive, Wifi, Clock, Activity } from 'lucide-react';

interface ServerSummaryCardsProps {
  metrics: SystemMetrics | null;
  isLoading: boolean;
}

export const ServerSummaryCards: React.FC<ServerSummaryCardsProps> = ({ metrics, isLoading }) => {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800"></div>
        ))}
      </div>
    );
  }

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CPU Card */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">CPU / Carga</span>
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-2xl font-black font-mono text-white">
            {metrics.cpu.usagePercent}%
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Load: {metrics.cpu.load1m} • {metrics.cpu.cores} Cores ARM
          </div>
        </div>
      </div>

      {/* RAM Card */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Memória RAM</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Database className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-2xl font-black font-mono text-white">
            {metrics.memory.usagePercent}%
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {formatBytes(metrics.memory.usedBytes)} / {formatBytes(metrics.memory.totalBytes)}
          </div>
        </div>
      </div>

      {/* Storage Disk Card */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Disco / Storage</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-2xl font-black font-mono text-white">
            {metrics.disk.usagePercent}%
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {formatBytes(metrics.disk.usedBytes)} / {formatBytes(metrics.disk.totalBytes)}
          </div>
        </div>
      </div>

      {/* Network / Uptime Card */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Rede & Uptime</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Wifi className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="text-lg font-bold font-mono text-white flex items-center gap-1 truncate">
            <span>↓{formatBytes(metrics.network.rxBytesSec)}/s</span>
            <span className="text-slate-600">|</span>
            <span>↑{formatBytes(metrics.network.txBytesSec)}/s</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            Uptime: {formatUptime(metrics.system.uptimeSeconds)}
          </div>
        </div>
      </div>
    </div>
  );
};
