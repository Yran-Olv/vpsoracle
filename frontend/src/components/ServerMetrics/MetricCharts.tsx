import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { MetricHistoryPoint, MetricStatsSummary } from '../../types';
import { metricsApi } from '../../services/api';
import { Activity, Cpu, Database, HardDrive, Wifi, RefreshCw } from 'lucide-react';

export const MetricCharts: React.FC = () => {
  const [range, setRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('1h');
  const [activeTab, setActiveTab] = useState<'cpu' | 'memory' | 'disk' | 'network'>('cpu');
  const [points, setPoints] = useState<MetricHistoryPoint[]>([]);
  const [summary, setSummary] = useState<MetricStatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await metricsApi.getHistory(range);
      setPoints(data.points);
      setSummary(data.summary);
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [range]);

  const formatTimeLabel = (timestamp: number) => {
    const d = new Date(timestamp);
    if (range === '7d' || range === '30d') {
      return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}h`;
    }
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-5">
      {/* Top Bar: Tabs and Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        {/* Metric Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('cpu')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'cpu'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>CPU</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'memory'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Memória</span>
          </button>

          <button
            onClick={() => setActiveTab('disk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'disk'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Disco / IOPS</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'network'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Rede</span>
          </button>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
          {(['1h', '6h', '24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                range === r
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Chips (Min, Max, Avg, Current) */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Mínimo</span>
            <div className="text-sm font-bold font-mono text-slate-300">
              {activeTab === 'cpu' && `${summary.cpu.min}%`}
              {activeTab === 'memory' && `${summary.memory.min}%`}
              {activeTab === 'disk' && `${summary.disk.min}%`}
              {activeTab === 'network' && `0 KB/s`}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Máximo</span>
            <div className="text-sm font-bold font-mono text-red-400">
              {activeTab === 'cpu' && `${summary.cpu.max}%`}
              {activeTab === 'memory' && `${summary.memory.max}%`}
              {activeTab === 'disk' && `${summary.disk.max}%`}
              {activeTab === 'network' && `${Math.round(summary.network.maxRx / 1024)} KB/s`}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Média</span>
            <div className="text-sm font-bold font-mono text-blue-400">
              {activeTab === 'cpu' && `${summary.cpu.avg}%`}
              {activeTab === 'memory' && `${summary.memory.avg}%`}
              {activeTab === 'disk' && `${summary.disk.avg}%`}
              {activeTab === 'network' && `${Math.round(summary.network.avgRx / 1024)} KB/s`}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Atual</span>
            <div className="text-sm font-bold font-mono text-emerald-400">
              {activeTab === 'cpu' && `${summary.cpu.current}%`}
              {activeTab === 'memory' && `${summary.memory.current}%`}
              {activeTab === 'disk' && `${summary.disk.current}%`}
              {activeTab === 'network' && `${Math.round(summary.network.avgRx / 1024)} KB/s`}
            </div>
          </div>
        </div>
      )}

      {/* Chart Area */}
      <div className="h-64 w-full pt-2">
        {isLoading && points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Carregando série histórica...</span>
          </div>
        ) : points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Nenhum ponto registrado no período selecionado. A coleta está ativa.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={formatTimeLabel}
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <YAxis
                stroke="#64748b"
                domain={activeTab === 'network' ? ['auto', 'auto'] : [0, 100]}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(v) => activeTab === 'network' ? `${Math.round(v/1024)}K` : `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d131f',
                  borderColor: '#1f293d',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                labelFormatter={(v) => new Date(v).toLocaleString('pt-BR')}
              />

              {activeTab === 'cpu' && (
                <Area
                  type="monotone"
                  dataKey="cpu"
                  name="CPU %"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                />
              )}

              {activeTab === 'memory' && (
                <Area
                  type="monotone"
                  dataKey="memory"
                  name="Memória RAM %"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMem)"
                />
              )}

              {activeTab === 'disk' && (
                <Area
                  type="monotone"
                  dataKey="disk"
                  name="Disco %"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDisk)"
                />
              )}

              {activeTab === 'network' && (
                <Area
                  type="monotone"
                  dataKey="netRxSec"
                  name="Download (RX B/s)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNet)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
