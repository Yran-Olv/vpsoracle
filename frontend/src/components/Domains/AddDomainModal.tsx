import React, { useState } from 'react';
import { X, Globe, Plus } from 'lucide-react';
import { domainsApi } from '../../services/api';

interface AddDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDomainAdded: () => void;
}

export const AddDomainModal: React.FC<AddDomainModalProps> = ({ isOpen, onClose, onDomainAdded }) => {
  const [domainName, setDomainName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) {
      setError('Informe o nome do domínio.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await domainsApi.add(domainName.trim(), targetUrl.trim() || undefined);
      setDomainName('');
      setTargetUrl('');
      onDomainAdded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar domínio.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#0d131f] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Adicionar Novo Domínio</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Domínio / Hostname</label>
            <input
              type="text"
              placeholder="ex: app.multivus.com.br"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">URL Alvo (Opcional)</label>
            <input
              type="url"
              placeholder="ex: https://app.multivus.com.br"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Cadastrando...' : 'Cadastrar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
