import React, { useState, useEffect } from 'react';
import { checkupApi, reportApi } from '../services/api';
import { CheckupReport } from '../types';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Download,
  Check
} from 'lucide-react';

export const CheckupPage: React.FC = () => {
  const [report, setReport] = useState<CheckupReport | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const fetchLatest = async () => {
    try {
      const res = await checkupApi.getLatest();
      setReport(res);
    } catch (e) {}
  };

  useEffect(() => {
    fetchLatest();
  }, []);

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

  const handleDownloadReport = () => {
    reportApi.downloadMarkdown();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Checkup Automático de Segurança & Recursos</h1>
            <p className="text-xs text-slate-400">
              18 verificações automáticas com relatório consolidado de integridade da VPS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Baixar Relatório</span>
          </button>

          <button
            onClick={handleRunCheckup}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all hover:scale-105"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Executando...' : 'Executar Checkup Completo'}</span>
          </button>
        </div>
      </div>

      {isRunning && (
        <div className="p-8 rounded-2xl glass-card border border-slate-800 text-center space-y-4">
          <RefreshCw className="w-8 h-8 mx-auto text-emerald-400 animate-spin" />
          <h3 className="text-sm font-semibold text-white">Diagnosticando a VPS Multivus...</h3>
          <p className="text-xs text-slate-400 font-mono">
            Avaliando CPU, RAM, Storage, Docker, Containers, Nginx, PostgreSQL, Redis, PM2, DNS, SSL, Portas, UFW, Oracle Free Tier e Billing...
          </p>
          <div className="w-full max-w-md mx-auto bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {report && !isRunning && (
        <div className="space-y-6">
          {/* Summary Score Bar */}
          <div className="p-5 rounded-2xl glass-card border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl border font-mono ${
                report.overallStatus === 'CRÍTICO'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : report.overallStatus === 'RISCO' || report.overallStatus === 'ATENÇÃO'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {report.overallScore}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">Status: {report.overallStatus}</span>
                  <span className="text-xs text-slate-400 font-mono">
                    (Executado em: {new Date(report.timestamp).toLocaleString('pt-BR')})
                  </span>
                </div>
                <p className="text-xs text-slate-300">{report.summary}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{report.okCount} OK</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>{report.warningCount} Atenção</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                <span>{report.criticalCount} Crítico</span>
              </div>
            </div>
          </div>

          {/* Detailed 18-checks List */}
          <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Resultados das 18 Verificações do Sistema
            </h3>

            <div className="space-y-2.5">
              {report.checks.map((c: any) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      {c.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {c.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                      {c.status === 'critical' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      <span className="text-xs font-bold text-white">{c.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({c.value})</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-6">{c.details}</p>
                    {c.recommendation && (
                      <p className="text-[11px] text-amber-300/90 pl-6 font-medium mt-1">
                        ↳ Ação Recomendada: {c.recommendation}
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
  );
};
