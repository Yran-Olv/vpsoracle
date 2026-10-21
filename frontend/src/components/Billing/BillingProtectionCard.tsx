import React, { useState } from 'react';
import { BillingProtectionReport } from '../../types';
import { DollarSign, ShieldAlert, AlertCircle, CheckCircle2, Edit2, Save, X } from 'lucide-react';
import { oracleApi } from '../../services/api';

interface BillingProtectionCardProps {
  billing: BillingProtectionReport | null;
  isLoading: boolean;
  onBudgetUpdated?: () => void;
}

export const BillingProtectionCard: React.FC<BillingProtectionCardProps> = ({ billing, isLoading, onBudgetUpdated }) => {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetVal, setBudgetVal] = useState('');

  if (isLoading || !billing) {
    return (
      <div className="p-6 rounded-2xl glass-card animate-pulse space-y-4">
        <div className="h-6 w-40 bg-slate-800 rounded"></div>
        <div className="h-28 bg-slate-800/60 rounded-xl"></div>
      </div>
    );
  }

  const handleSaveBudget = async () => {
    const num = parseFloat(budgetVal);
    if (!isNaN(num) && num >= 0) {
      await oracleApi.updateBudget(num);
      setIsEditingBudget(false);
      if (onBudgetUpdated) onBudgetUpdated();
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case '100%':
      case '90%':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case '75%':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case '50%':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/10 border border-emerald-500/30 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
              Billing Protection & Alerta de Custo
            </h2>
            <p className="text-xs text-slate-400">
              Período Atual: {billing.currentBillingPeriod}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${getTierBadge(billing.alertTier)}`}>
            <span>Tier: {billing.alertTier}</span>
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Estimated Cost */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Gasto Estimado Atual</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center gap-1">
            <span>US$</span>
            <span>{billing.currentEstimatedCostUsd.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-slate-500">100% coberto pelo Always Free</p>
        </div>

        {/* Budget Configured */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Budget Configurado</span>
            {!isEditingBudget ? (
              <button
                onClick={() => { setBudgetVal(String(billing.budgetConfiguredUsd)); setIsEditingBudget(true); }}
                className="text-slate-400 hover:text-white"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {!isEditingBudget ? (
            <div className="text-2xl font-bold font-mono text-white flex items-center gap-1">
              <span>US$</span>
              <span>{billing.budgetConfiguredUsd.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                step="0.50"
                value={budgetVal}
                onChange={(e) => setBudgetVal(e.target.value)}
                className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-sm text-white font-mono"
              />
              <button onClick={handleSaveBudget} className="p-1 text-emerald-400 hover:text-emerald-300">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => setIsEditingBudget(false)} className="p-1 text-slate-400 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Limite de alerta financeiro</p>
        </div>

        {/* Budget Utilization % */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Utilização do Budget</span>
          <div className="text-2xl font-bold font-mono text-white">
            {billing.budgetUtilizationPercent}%
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${Math.min(100, Math.max(2, billing.budgetUtilizationPercent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Alert Tiers indicator */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-slate-400 font-medium">Escala de Alertas do Budget:</div>
        <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono font-bold">
          <div className={`p-1.5 rounded-lg border ${billing.alertTier === '25%' || billing.alertTier === '50%' || billing.alertTier === '75%' || billing.alertTier === '90%' || billing.alertTier === '100%' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-900/60 text-slate-500 border-slate-800'}`}>
            🟢 25%
          </div>
          <div className={`p-1.5 rounded-lg border ${billing.alertTier === '50%' || billing.alertTier === '75%' || billing.alertTier === '90%' || billing.alertTier === '100%' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-900/60 text-slate-500 border-slate-800'}`}>
            🟡 50%
          </div>
          <div className={`p-1.5 rounded-lg border ${billing.alertTier === '75%' || billing.alertTier === '90%' || billing.alertTier === '100%' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-slate-900/60 text-slate-500 border-slate-800'}`}>
            🟠 75%
          </div>
          <div className={`p-1.5 rounded-lg border ${billing.alertTier === '90%' || billing.alertTier === '100%' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-slate-900/60 text-slate-500 border-slate-800'}`}>
            🔴 90%
          </div>
          <div className={`p-1.5 rounded-lg border ${billing.alertTier === '100%' ? 'bg-red-600/30 text-red-300 border-red-500' : 'bg-slate-900/60 text-slate-500 border-slate-800'}`}>
            🚨 100%
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer Box */}
      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300/90">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Aviso Importante:</strong> {billing.disclaimer}
        </p>
      </div>
    </div>
  );
};
