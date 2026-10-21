import React from 'react';
import { FreeTierRiskReport } from '../../types';
import { 
  AlertOctagon, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  ArrowRight,
  Shield
} from 'lucide-react';

interface RiskScoreCardProps {
  riskReport: FreeTierRiskReport | null;
  isLoading: boolean;
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ riskReport, isLoading }) => {
  if (isLoading || !riskReport) {
    return (
      <div className="p-6 rounded-2xl glass-card animate-pulse space-y-4">
        <div className="h-6 w-36 bg-slate-800 rounded"></div>
        <div className="h-24 bg-slate-800/60 rounded-xl"></div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 81) return 'text-red-400 border-red-500/40 bg-red-500/10';
    if (score >= 61) return 'text-orange-400 border-orange-500/40 bg-orange-500/10';
    if (score >= 31) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  };

  return (
    <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/10 border border-blue-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
              Free Tier Risk Engine
            </h2>
            <p className="text-xs text-slate-400">
              Análise contínua de risco de custos imprevistos, esgotamento de cotas e falhas
            </p>
          </div>
        </div>

        {/* Score Gauge */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 ${getScoreColor(riskReport.score)}`}>
            <div className="text-2xl font-black font-mono tracking-tight">
              {riskReport.score}
              <span className="text-xs text-slate-400 font-normal">/100</span>
            </div>
            <div className="text-left border-l border-current/20 pl-2.5">
              <div className="text-[10px] uppercase tracking-wider font-bold">Risco</div>
              <div className="text-xs font-extrabold">{riskReport.statusBadge}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Message */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
        {riskReport.summary}
      </div>

      {/* Risk Factors List */}
      {riskReport.riskFactors.length === 0 ? (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3 text-emerald-300 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Nenhum fator de risco ativo detectado. A VPS está 100% em conformidade com as regras Always Free.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Fatores que Requerem Atenção
          </h3>
          <div className="space-y-3">
            {riskReport.riskFactors.map((rf) => (
              <div
                key={rf.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {rf.severity === 'critical' ? (
                      <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-white">{rf.title}</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                    rf.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {rf.severity}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] pt-1 border-t border-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-semibold block">O que aconteceu:</span>
                    <span className="text-slate-200">{rf.whatHappened}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-semibold block">Por que isso importa:</span>
                    <span className="text-slate-200">{rf.whyItMatters}</span>
                  </div>
                  <div className="space-y-0.5 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                    <span className="text-blue-400 font-bold block flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> O que fazer:
                    </span>
                    <span className="text-slate-200">{rf.whatToDo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
