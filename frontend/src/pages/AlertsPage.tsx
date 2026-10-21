import React, { useState, useEffect } from 'react';
import { alertsApi } from '../services/api';
import { AlertConfig, AlertHistory, Incident } from '../types';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Settings2, 
  Save, 
  History 
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempThreshold, setTempThreshold] = useState<number>(0);

  const fetchAlertsData = async () => {
    setIsLoading(true);
    try {
      const [conf, hist, inc] = await Promise.all([
        alertsApi.getConfigs().catch(() => []),
        alertsApi.getHistory().catch(() => []),
        alertsApi.getIncidents().catch(() => [])
      ]);
      setConfigs(conf);
      setHistory(hist);
      setIncidents(inc);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsData();
  }, []);

  const handleSaveConfig = async (config: AlertConfig) => {
    await alertsApi.updateConfig(config.id, tempThreshold, config.severity, config.isEnabled);
    setEditingId(null);
    fetchAlertsData();
  };

  const handleToggleEnable = async (config: AlertConfig) => {
    await alertsApi.updateConfig(config.id, config.thresholdValue, config.severity, !config.isEnabled);
    fetchAlertsData();
  };

  const handleAcknowledge = async (id: number) => {
    await alertsApi.acknowledge(id);
    fetchAlertsData();
  };

  const formatDowntime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Bell className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Central de Alertas & Incidentes</h1>
          <p className="text-xs text-slate-400">
            Configuração de limiares, histórico de notificações e registro de downtime
          </p>
        </div>
      </div>

      {/* 1. Incident Timeline */}
      <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Clock className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-bold text-white">Linha do Tempo de Incidentes & Downtime</h2>
        </div>

        {incidents.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
            Nenhum incidente de indisponibilidade registrado. A VPS mantém 100% de disponibilidade.
          </div>
        ) : (
          <div className="space-y-2.5">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  {inc.status === 'resolved' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">{inc.message}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Início: {new Date(inc.startedAt).toLocaleTimeString('pt-BR')}
                      {inc.resolvedAt && ` • Recuperado: ${new Date(inc.resolvedAt).toLocaleTimeString('pt-BR')}`}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 font-mono text-right">
                  {inc.status === 'resolved' ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      Downtime: {formatDowntime(inc.downtimeSeconds)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold animate-pulse">
                      Em andamento
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Alert Threshold Configurations */}
      <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Settings2 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">Regras e Limiares de Alerta</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{c.label}</span>
                <button
                  onClick={() => handleToggleEnable(c)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {c.isEnabled ? 'Ativo' : 'Desativado'}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Gatilho de Disparo:</span>
                {editingId === c.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={tempThreshold}
                      onChange={(e) => setTempThreshold(Number(e.target.value))}
                      className="w-16 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-white font-mono text-xs"
                    />
                    <button onClick={() => handleSaveConfig(c)} className="text-emerald-400">
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-amber-400 font-bold">
                      {c.operator === 'gt' ? '>' : '<'} {c.thresholdValue}
                    </span>
                    <button
                      onClick={() => { setEditingId(c.id); setTempThreshold(c.thresholdValue); }}
                      className="text-slate-500 hover:text-white"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Alert Event History */}
      <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <History className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold text-white">Histórico de Alertas Recentes</h2>
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
            Nenhum evento de alerta registrado recentemente.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-white">{h.title}</div>
                  <div className="text-[11px] text-slate-400">{h.message}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(h.triggeredAt).toLocaleString('pt-BR')}
                  </div>
                </div>

                {!h.isAcknowledged && (
                  <button
                    onClick={() => handleAcknowledge(h.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold shrink-0"
                  >
                    Reconhecer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
