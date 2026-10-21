import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  RefreshCw, 
  Download,
  Check
} from 'lucide-react';
import { CheckupReport } from '../../types';
import { checkupApi, reportApi } from '../../services/api';

interface CheckupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckupModal: React.FC<CheckupModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<CheckupReport | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  if (!isOpen) return null;

  const handleRunCheckup = async () => {
    setIsRunning(true);
    setProgress(15);
    const timer = setInterval(() => {
      setProgress(p => (p < 90 ? p + 15 : p));
    }, 400);

    try {
      const res = await checkupApi.runCheckup();
      setProgress(100);
      setTimeout(() => {
        setReport(res);
        setIsRunning(false);
      }, 500);
    } catch (err) {
      setIsRunning(false);
    } finally {
      clearInterval(timer);
    }
  };

  const handleDownload = () => {
    reportApi.downloadMarkdown();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0d131f] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                Checkup Automático de Segurança & Recursos
              </h2>
              <p className="text-xs text-slate-400">
                18 verificações completas de CPU, RAM, Storage, Docker, Serviços, Domínios, SSL e Oracle Free Tier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5">
          {!report && !isRunning && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400 animate-pulse-slow" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-white">Pronto para Diagnosticar a VPS</h3>
                <p className="text-xs text-slate-400 mt-1">
                  O sistema executará testes em tempo real na máquina, containers, certificados e limites da tenancy Oracle Always Free.
                </p>
              </div>
              <button
                onClick={handleRunCheckup}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all hover:scale-105"
              >
                Iniciar Checkup Agora
              </button>
            </div>
          )}

          {isRunning && (
            <div className="text-center py-12 space-y-4">
              <RefreshCw className="w-10 h-10 mx-auto text-emerald-400 animate-spin" />
              <h3 className="text-sm font-semibold text-white">Executando Diagnóstico do Sistema...</h3>
              <p className="text-xs text-slate-400 font-mono">Testando telemetria, portas, socket Docker e cotas OCI...</p>
              <div className="w-full max-w-md mx-auto bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {report && !isRunning && (
            <div className="space-y-6">
              {/* Score and Summary Header */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl border ${
                    report.overallStatus === 'CRÍTICO'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : report.overallStatus === 'RISCO' || report.overallStatus === 'ATENÇÃO'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {report.overallScore}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Status: {report.overallStatus}</span>
                      <span className="text-[10px] text-slate-400">({report.totalChecks} Verificações)</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{report.summary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{report.okCount} OK</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{report.warningCount} Atenção</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{report.criticalCount} Crítico</span>
                  </div>
                </div>
              </div>

              {/* Checks Checklist */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Detalhamento dos Testes
                </h4>
                <div className="space-y-2">
                  {report.checks.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {c.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                          {c.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                          {c.status === 'critical' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                          <span className="text-xs font-semibold text-white">{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({c.value})</span>
                        </div>
                        <p className="text-[11px] text-slate-400 pl-6">{c.details}</p>
                        {c.recommendation && (
                          <p className="text-[11px] text-amber-300/90 pl-6 font-medium mt-1">
                            ↳ Ação: {c.recommendation}
                          </p>
                        )}
                      </div>

                      <div className="pl-6 md:pl-0 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.status === 'ok' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : c.status === 'warning' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {c.statusBadge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
          <button
            onClick={handleRunCheckup}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>Refazer Checkup</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Baixar Relatório (.md)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
