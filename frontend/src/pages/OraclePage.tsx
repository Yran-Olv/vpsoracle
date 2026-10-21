import React, { useState, useEffect } from 'react';
import { useServer } from '../context/ServerContext';
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
  BookOpen,
  Server
} from 'lucide-react';

export const OraclePage: React.FC = () => {
  const { servers, activeServer, activeServerId, setActiveServerId } = useServer();
  const [guard, setGuard] = useState<OracleFreeGuardReport | null>(null);
  const [instance, setInstance] = useState<OciInstanceMetadata | null>(null);
  const [billing, setBilling] = useState<BillingProtectionReport | null>(null);
  const [rules, setRules] = useState<OracleRule[]>([]);
  const [changes, setChanges] = useState<OracleRuleChange[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshingRules, setIsRefreshingRules] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const isOracle = activeServer?.provider === 'oracle' || (activeServerId === 1 && !activeServer);

  const fetchOracleData = async () => {
    if (!isOracle) {
      setIsLoading(false);
      return;
    }
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
  }, [activeServerId, isOracle]);

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

  const switchToOracle = () => {
    const oracleServer = servers.find(s => s.provider === 'oracle') || servers[0];
    if (oracleServer) {
      setActiveServerId(oracleServer.id);
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

        {isOracle && (
          <button
            onClick={handleRefreshRules}
            disabled={isRefreshingRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold self-start sm:self-auto transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRules ? 'animate-spin text-red-400' : ''}`} />
            <span>Verificar Regras na Oracle</span>
          </button>
        )}
      </div>

      {/* Non-Oracle Server Notice */}
      {!isOracle ? (
        <div className="p-6 rounded-2xl glass-card border border-amber-500/30 bg-amber-500/5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-amber-300">
                Oracle Free Guard não aplicável ao servidor atual
              </h2>
              <p className="text-xs text-slate-300">
                O servidor selecionado atualmente no painel é <strong className="text-white">{activeServer?.name}</strong>, identificado com o provedor <strong className="text-white capitalize">{activeServer?.provider}</strong>.
              </p>
              <p className="text-xs text-slate-400">
                O módulo Oracle Free Guard monitora cotas de OCPUs ARM Ampere A1 (24 GB RAM / 4 OCPUs), armazenamento Always Free (200 GB) e consulta os metadados do Oracle IMDS.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Deseja alternar para um servidor Oracle Cloud?
            </span>
            <button
              onClick={switchToOracle}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-900/30"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Alternar para Servidor Oracle</span>
            </button>
          </div>
        </div>
      ) : (
        <>
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
                        <span className="text-slate-500">Valor Anterior:</span>{' '}
                        <span className="text-red-400 font-bold">{ch.oldValue}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Novo Valor Oficial:</span>{' '}
                        <span className="text-emerald-400 font-bold">{ch.newValue}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Official Rules Database */}
          <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold text-white">
                  Regras & Limites Always Free Oficiais da Oracle (OCI)
                </h2>
              </div>
              <a
                href="https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
              >
                <span>Docs Oficiais</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{r.label}</span>
                    <span className="font-mono text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {r.officialValue} {r.officialUnit}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{r.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
