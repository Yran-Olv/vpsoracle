import React, { useState, useEffect } from 'react';
import { DockerContainer } from '../../types';
import { dockerApi } from '../../services/api';
import { X, RefreshCw, Terminal, Copy, Check } from 'lucide-react';

interface ContainerLogsModalProps {
  container: DockerContainer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ContainerLogsModal: React.FC<ContainerLogsModalProps> = ({ container, isOpen, onClose }) => {
  const [logs, setLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<number>(100);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchLogs = async () => {
    if (!container) return;
    setIsLoading(true);
    try {
      const res = await dockerApi.getLogs(container.id, lines);
      setLogs(res.logs || 'Nenhum log retornado pelo container.');
    } catch (err: any) {
      setLogs(`Erro ao carregar logs: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && container) {
      fetchLogs();
    }
  }, [isOpen, container, lines]);

  if (!isOpen || !container) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0d131f] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Terminal className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-white">
                  Logs do Container: {container.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {container.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Imagem: {container.image} • Status: {container.stateString}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={lines}
              onChange={(e) => setLines(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 font-mono"
            >
              <option value={50}>50 linhas</option>
              <option value={100}>100 linhas</option>
              <option value={250}>250 linhas</option>
              <option value={500}>500 linhas</option>
            </select>

            <button
              onClick={fetchLogs}
              disabled={isLoading}
              title="Recarregar logs"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              onClick={handleCopy}
              title="Copiar logs"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs terminal window */}
        <div className="flex-1 p-4 bg-[#050811] overflow-y-auto font-mono text-xs text-slate-300 select-text leading-relaxed whitespace-pre-wrap">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Carregando logs do daemon Docker...</span>
            </div>
          ) : (
            logs
          )}
        </div>

        {/* Footer info with ports and mounts */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
          <div>
            Portas:{' '}
            {container.ports.length > 0 ? (
              container.ports.map((p, idx) => (
                <span key={idx} className="text-white mr-2">
                  {p.hostPort ? `${p.hostPort}->${p.containerPort}/${p.protocol}` : `${p.containerPort}/${p.protocol}`}
                </span>
              ))
            ) : (
              <span className="text-slate-500">Nenhuma porta pública mapeada</span>
            )}
          </div>
          <div>Uptime: {container.uptime}</div>
        </div>
      </div>
    </div>
  );
};
