import React, { useState } from 'react';
import { MonitoredDomain } from '../../types';
import { 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  AlertTriangle, 
  ExternalLink, 
  Plus, 
  Trash2, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { domainsApi } from '../../services/api';
import { AddDomainModal } from './AddDomainModal';

interface DomainsListProps {
  domains: MonitoredDomain[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const DomainsList: React.FC<DomainsListProps> = ({ domains, isLoading, onRefresh }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [checkingId, setCheckingId] = useState<number | null>(null);

  const handleCheckNow = async (id: number) => {
    setCheckingId(id);
    try {
      await domainsApi.check(id);
      onRefresh();
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja remover este domínio do monitoramento?')) {
      await domainsApi.delete(id);
      onRefresh();
    }
  };

  return (
    <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
              Domain & SSL Monitor
            </h2>
            <p className="text-xs text-slate-400">
              Verificação de DNS, status HTTP 200, tempo de resposta e contagem regressiva de expiração SSL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Domínio</span>
          </button>
        </div>
      </div>

      {/* Grid of Domains */}
      {isLoading && domains.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-400 mb-2" />
          Verificando status de rede dos domínios...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domains.map((d) => {
            const isOnline = d.isOnline;
            const isSslExpiring = d.ssl.daysRemaining !== null && d.ssl.daysRemaining <= 15;
            return (
              <div
                key={d.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
              >
                {/* Domain Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
                      <a
                        href={d.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-white hover:text-blue-400 transition-colors flex items-center gap-1 font-mono"
                      >
                        <span>{d.domainName}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono pl-4">
                      {d.dnsRecords.ipv4.length > 0 ? `DNS: ${d.dnsRecords.ipv4.join(', ')}` : 'DNS: Sem resolução'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCheckNow(d.id)}
                      disabled={checkingId === d.id}
                      title="Checar agora"
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingId === d.id ? 'animate-spin text-blue-400' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      title="Excluir"
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* HTTP & SSL Status Row */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono">
                  {/* HTTP Status */}
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 space-y-1">
                    <span className="text-slate-500 text-[10px] block">HTTP Status</span>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold flex items-center gap-1 ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isOnline ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {d.statusCode || 'Off'}
                      </span>
                      <span className="text-slate-400">{d.responseTimeMs ? `${d.responseTimeMs}ms` : '-'}</span>
                    </div>
                  </div>

                  {/* SSL Status */}
                  <div className={`p-2.5 rounded-lg border space-y-1 ${
                    isSslExpiring ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950/60 border-slate-800/60'
                  }`}>
                    <span className="text-slate-500 text-[10px] block">Certificado SSL</span>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold flex items-center gap-1 ${
                        d.ssl.valid ? (isSslExpiring ? 'text-amber-400' : 'text-emerald-400') : 'text-red-400'
                      }`}>
                        <Lock className="w-3.5 h-3.5" />
                        {d.ssl.valid ? 'Válido' : 'Inválido'}
                      </span>
                      <span className="text-slate-300 font-semibold">
                        {d.ssl.daysRemaining !== null ? `${d.ssl.daysRemaining} dias` : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer with SSL issuer */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Emissor: {d.ssl.issuer || 'N/A'}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {d.lastCheckedAt ? new Date(d.lastCheckedAt).toLocaleTimeString('pt-BR') : 'Aguardando'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Domain Modal */}
      <AddDomainModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onDomainAdded={onRefresh}
      />
    </div>
  );
};
