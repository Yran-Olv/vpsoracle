import React, { useState, useEffect } from 'react';
import { OracleFreeGuardCard } from '../components/OracleFreeGuard/OracleFreeGuardCard';
import { OciInstanceCard } from '../components/OracleFreeGuard/OciInstanceCard';
import { BillingProtectionCard } from '../components/Billing/BillingProtectionCard';
import { oracleApi } from '../services/api';
import { 
  OracleFreeGuardReport, 
  BillingProtectionReport, 
  OracleRule, 
  OracleRuleChange,
  OciInstanceMetadata 
} from '../types';
import { 
  ShieldAlert, 
  RefreshCw, 
  ExternalLink, 
  AlertOctagon, 
  CheckCircle2, 
  Info,
  BookOpen
} from 'lucide-react';

export const OraclePage: React.FC = () => {
  const [guard, setGuard] = useState<OracleFreeGuardReport | null>(null);
  const [instance, setInstance] = useState<OciInstanceMetadata | null>(null);
  const [billing, setBilling] = useState<BillingProtectionReport | null>(null);
  const [rules, setRules] = useState<OracleRule[]>([]);
  const [changes, setChanges] = useState<OracleRuleChange[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshingRules, setIsRefreshingRules] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const fetchOracleData = async () => {
    setIsLoading(true);
    try {
      const [guardRes, instanceRes, billingRes, rulesRes, changesRes] = await Promise.all([
        oracleApi.getFreeGuard().catch(() => null),
        oracleApi.getInstance().catch(() => null),
        oracleApi.getBilling().catch(() => null),
        oracleApi.getRules().catch(() => []),
        oracleApi.getChanges().catch(() => [])
      ]);

      if (guardRes) {
        setGuard(guardRes);
        if (guardRes.instance) setInstance(guardRes.instance);
      }
      if (instanceRes) setInstance(instanceRes);
      if (billingRes) setBilling(billingRes);
      if (rulesRes) setRules(rulesRes);
      if (changesRes) setChanges(changesRes);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOracleData();
  }, []);

  const handleRefreshRules = async () => {
    setIsRefreshingRules(true);
    setRefreshMessage(null);
    try {
      const res = await oracleApi.refreshRules();
      setRefreshMessage(res.message);
      setRules(res.rules);
    } catch (e: any) {
      setRefreshMessage('Falha ao verificar regras na documentação externa.');
    } finally {
      setIsRefreshingRules(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Oracle Cloud Always Free Hub</h1>
            <p className="text-xs text-slate-400">
              Metadados da instância em tempo real, proteção de cotas Always Free, regras oficiais e billing
            </p>
          </div>
        </div>

        <button
          onClick={handleRefreshRules}
          disabled={isRefreshingRules}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRules ? 'animate-spin text-red-400' : ''}`} />
          <span>Verificar Regras na Oracle</span>
        </button>
      </div>

      {refreshMessage && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{refreshMessage}</span>
        </div>
      )}

      {/* 1. Real OCI Instance Metadata Card */}
      <OciInstanceCard instance={instance} isLoading={isLoading} />

      {/* 2. Oracle Free Guard */}
      <OracleFreeGuardCard guard={guard} isLoading={isLoading} />

      {/* 3. Billing Protection */}
      <BillingProtectionCard billing={billing} isLoading={isLoading} onBudgetUpdated={fetchOracleData} />

      {/* 4. Rule Change Tracker History */}
      {changes.length > 0 && (
        <div className="rounded-2xl glass-card border border-amber-500/30 p-5 md:p-6 space-y-4 bg-amber-500/5">
          <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
            <AlertOctagon className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-300">
              Histórico de Alterações nas Regras da Oracle Cloud
            </h2>
          </div>

          <div className="space-y-3">
            {changes.map((ch) => (
              <div
                key={ch.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400">🚨 ALTERAÇÃO DETECTADA: {ch.ruleLabel}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(ch.detectedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] p-2 bg-slate-900 rounded-lg">
                  <div>
                    <span className="text-slate-500 block">Antes:</span>
                    <span className="text-red-400 font-bold">{ch.oldValue}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Depois:</span>
                    <span className="text-emerald-400 font-bold">{ch.newValue}</span>
                  </div>
                </div>

                <p className="text-slate-300 text-[11px]">{ch.impactDescription}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Official Rules Catalog */}
      <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Catálogo de Limites Oficiais Always Free</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Fonte: docs.oracle.com</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Recurso / Cota</th>
                <th className="pb-3 font-semibold">Limite Oficial</th>
                <th className="pb-3 font-semibold">Classificação</th>
                <th className="pb-3 font-semibold">Observações / Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 font-sans font-medium text-white pr-3">{r.label}</td>
                  <td className="py-3 text-emerald-400 font-bold pr-3">{r.officialValue} {r.officialUnit}</td>
                  <td className="py-3 pr-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-sans font-bold ${
                      r.classification === 'Oficial' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {r.classification === 'Oficial' ? '🟢 Oficial' : '🔵 Comunidade'}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400 font-sans text-[11px] leading-relaxed max-w-md">
                    {r.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
