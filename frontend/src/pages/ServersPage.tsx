import React, { useState, useEffect } from 'react';
import { useServer } from '../context/ServerContext';
import { useAuth } from '../context/AuthContext';
import { serversApi } from '../services/api';
import { ServerItem } from '../types';
import { 
  Server, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  Copy, 
  Check, 
  Trash2, 
  Power, 
  Key, 
  Layers, 
  Terminal, 
  ExternalLink,
  Edit2,
  X,
  Radio,
  Search,
  Filter
} from 'lucide-react';

export const ServersPage: React.FC = () => {
  const { servers, activeServerId, setActiveServerId, refreshServers, isLoading } = useServer();
  const { user } = useAuth();
  const isAdminOrOperator = user?.role === 'admin' || user?.role === 'operator';
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form states
  const [selectedServer, setSelectedServer] = useState<ServerItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    ip_address: '',
    port: 443,
    provider: 'generic',
    environment: 'production',
    connection_type: 'agent',
    notes: ''
  });

  // Dynamic Agent Token & script display
  const [agentToken, setAgentToken] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Connection testing states: map of serverId -> { testing: boolean, result?: any }
  const [testingMap, setTestingMap] = useState<Record<number, { testing: boolean; result?: any }>>({});

  // Deletion options
  const [deleteHistory, setDeleteHistory] = useState(false);

  const filteredServers = servers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.ip_address.toLowerCase().includes(search.toLowerCase()) ||
      (s.hostname && s.hostname.toLowerCase().includes(search.toLowerCase()));
    const matchesProvider = providerFilter === 'all' || s.provider === providerFilter;
    return matchesSearch && matchesProvider;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      hostname: '',
      ip_address: '',
      port: 443,
      provider: 'generic',
      environment: 'production',
      connection_type: 'agent',
      notes: ''
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (server: ServerItem) => {
    setSelectedServer(server);
    setFormData({
      name: server.name,
      hostname: server.hostname || '',
      ip_address: server.ip_address,
      port: server.port || 443,
      provider: server.provider,
      environment: server.environment,
      connection_type: server.connection_type,
      notes: server.notes || ''
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await serversApi.create(formData as any);
      setIsAddModalOpen(false);
      await refreshServers();
      if (res.rawAgentToken) {
        setSelectedServer(res.server);
        setAgentToken(res.rawAgentToken);
        setIsAgentModalOpen(true);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Erro ao cadastrar servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await serversApi.update(selectedServer.id, formData as any);
      setIsEditModalOpen(false);
      await refreshServers();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Erro ao atualizar servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (server: ServerItem) => {
    try {
      await serversApi.toggleStatus(server.id);
      await refreshServers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const handleRotateToken = async (server: ServerItem) => {
    if (!window.confirm(`Deseja realmente rotacionar o token de segurança para "${server.name}"? O agente remoto precisará ser reconfigurado.`)) {
      return;
    }
    try {
      const res = await serversApi.rotateToken(server.id);
      setSelectedServer(server);
      setAgentToken(res.rawAgentToken);
      setIsAgentModalOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao rotacionar token');
    }
  };

  const handleTestConnection = async (serverId: number) => {
    setTestingMap(prev => ({ ...prev, [serverId]: { testing: true } }));
    try {
      const res = await serversApi.testConnection(serverId);
      setTestingMap(prev => ({ ...prev, [serverId]: { testing: false, result: res } }));
      await refreshServers();
    } catch (err: any) {
      setTestingMap(prev => ({
        ...prev,
        [serverId]: { testing: false, result: { reachable: false, message: 'Falha na requisição de teste' } }
      }));
    }
  };

  const handleDeleteServer = async () => {
    if (!selectedServer) return;
    setIsSubmitting(true);
    try {
      await serversApi.delete(selectedServer.id, deleteHistory);
      setIsDeleteModalOpen(false);
      if (activeServerId === selectedServer.id) {
        setActiveServerId(1);
      }
      await refreshServers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAgentInstallCommand = (token: string) => {
    const origin = window.location.origin;
    return `curl -sSL "${origin}/api/agent/install.sh?token=${token}" | sudo bash`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return `há ${diffSec}s`;
    if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)}h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Server className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Gerenciamento de Servidores VPS
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Frota Multivus
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Cadastre, monitore e comute entre servidores Oracle Cloud, Ubuntu, Debian e outros Linux.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshServers()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {isAdminOrOperator && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 border border-blue-400/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Servidor</span>
            </button>
          )}
        </div>
      </div>

      {/* Fleet Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Servidores</div>
          <div className="text-2xl font-extrabold text-white font-mono">{servers.length}</div>
          <div className="text-[10px] text-slate-500">Cadastrados no painel</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Servidores Ativos</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {servers.filter(s => s.status === 'active').length}
          </div>
          <div className="text-[10px] text-slate-500">Coletando métricas</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Em Produção</div>
          <div className="text-2xl font-extrabold text-blue-400 font-mono">
            {servers.filter(s => s.environment === 'production').length}
          </div>
          <div className="text-[10px] text-slate-500">Ambiente crítico</div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Oracle Cloud Always Free</div>
          <div className="text-2xl font-extrabold text-red-400 font-mono">
            {servers.filter(s => s.provider === 'oracle').length}
          </div>
          <div className="text-[10px] text-slate-500">Cota OCI monitorada</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl glass-card border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, IP ou host..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Provedor:
          </span>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os Provedores</option>
            <option value="oracle">Oracle Cloud</option>
            <option value="generic">Linux Genérico / VPS</option>
            <option value="aws">AWS</option>
            <option value="hetzner">Hetzner</option>
          </select>
        </div>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServers.map((server) => {
          const isSelected = activeServerId === server.id;
          const testStatus = testingMap[server.id];
          const isOnline = server.connection_type === 'local' || (server.last_seen_at && (Date.now() - new Date(server.last_seen_at).getTime() < 120000));

          return (
            <div
              key={server.id}
              className={`rounded-2xl glass-card border p-5 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-blue-500/50 bg-blue-950/10 shadow-lg shadow-blue-950/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Top: Header & Badges */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {server.provider === 'oracle' ? (
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                      ) : (
                        <Server className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white truncate max-w-[150px]">
                          {server.name}
                        </h3>
                        {server.is_default ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Principal
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {server.ip_address}:{server.port}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex flex-col items-end gap-1">
                    {server.status === 'disabled' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Desativado
                      </span>
                    ) : isOnline ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Aguardando
                      </span>
                    )}

                    <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400">
                      {server.environment}
                    </span>
                  </div>
                </div>

                {/* Specs & Connection Details */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Host:</span>
                    <span className="text-slate-200 truncate max-w-[150px]">{server.hostname || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Provedor:</span>
                    <span className="text-slate-200 capitalize">{server.provider}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Método:</span>
                    <span className="text-slate-200 uppercase text-[10px]">{server.connection_type}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Última Telemetria:</span>
                    <span className="text-slate-300">{formatLastSeen(server.last_seen_at)}</span>
                  </div>
                  {server.agent_version && (
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Versão Agente:</span>
                      <span className="text-blue-400 font-semibold">{server.agent_version}</span>
                    </div>
                  )}
                </div>

                {/* Test Connection Result Feedback */}
                {testStatus?.result && (
                  <div
                    className={`p-2 rounded-xl text-[10px] flex items-center gap-2 ${
                      testStatus.result.reachable
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-300 border border-red-500/20'
                    }`}
                  >
                    {testStatus.result.reachable ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                    <span className="truncate">{testStatus.result.message}</span>
                  </div>
                )}
              </div>

              {/* Card Bottom: Selection & Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveServerId(server.id)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Servidor Ativo</span>
                      </>
                    ) : (
                      <span>Selecionar Servidor</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleTestConnection(server.id)}
                    disabled={testStatus?.testing}
                    title="Testar Conexão com Agente"
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
                  >
                    <Radio className={`w-4 h-4 ${testStatus?.testing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
                  </button>
                </div>

                {isAdminOrOperator && (
                  <div className="flex items-center justify-between gap-1 pt-1 text-[11px]">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(server)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Editar Servidor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {server.connection_type === 'agent' && (
                        <button
                          onClick={() => handleRotateToken(server)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                          title="Rotacionar Token / Gerar Script"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleStatus(server)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          server.status === 'active'
                            ? 'text-slate-400 hover:text-amber-400'
                            : 'text-emerald-400 hover:text-emerald-300'
                        } hover:bg-slate-800`}
                        title={server.status === 'active' ? 'Desativar Servidor' : 'Ativar Servidor'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isAdmin && !server.is_default && (
                      <button
                        onClick={() => {
                          setSelectedServer(server);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Excluir Servidor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Adicionar Servidor */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0d131f] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Cadastrar Novo Servidor VPS</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Nome Amigável *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Oracle Backup, VPS Clientes"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Hostname (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: vps-oracle-02"
                    value={formData.hostname}
                    onChange={e => setFormData({ ...formData, hostname: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Endereço IP / Domínio *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 147.15.19.45"
                    value={formData.ip_address}
                    onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Porta</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={e => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 443 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Provedor</label>
                  <select
                    value={formData.provider}
                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="generic">Ubuntu / Debian / Linux Genérico</option>
                    <option value="oracle">Oracle Cloud Infrastructure (OCI)</option>
                    <option value="aws">Amazon Web Services (AWS)</option>
                    <option value="hetzner">Hetzner Cloud</option>
                    <option value="digitalocean">DigitalOcean</option>
                    <option value="other">Outro Provedor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Ambiente</label>
                  <select
                    value={formData.environment}
                    onChange={e => setFormData({ ...formData, environment: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="production">Produção</option>
                    <option value="staging">Homologação / Staging</option>
                    <option value="backup">Backup / Disaster Recovery</option>
                    <option value="development">Desenvolvimento</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Método de Telemetria</label>
                <select
                  value={formData.connection_type}
                  onChange={e => setFormData({ ...formData, connection_type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="agent">Agente Remoto Leve (Recomendado - HTTPS Bearer Token)</option>
                  <option value="ssh">SSH Direto (Verificações Administrativas)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  O agente é instalado via script one-liner e envia métricas seguras sem abrir portas na VPS.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Observações (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Finalidade, serviços rodando, notas da equipe..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-900/30"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Cadastrar Servidor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Servidor */}
      {isEditModalOpen && selectedServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0d131f] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Editar Servidor: {selectedServer.name}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Nome Amigável *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Hostname</label>
                  <input
                    type="text"
                    value={formData.hostname}
                    onChange={e => setFormData({ ...formData, hostname: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Endereço IP / Domínio *</label>
                  <input
                    type="text"
                    required
                    value={formData.ip_address}
                    onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Porta</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={e => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 443 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Provedor</label>
                  <select
                    value={formData.provider}
                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="generic">Ubuntu / Debian / Linux Genérico</option>
                    <option value="oracle">Oracle Cloud Infrastructure (OCI)</option>
                    <option value="aws">Amazon Web Services (AWS)</option>
                    <option value="hetzner">Hetzner Cloud</option>
                    <option value="digitalocean">DigitalOcean</option>
                    <option value="other">Outro Provedor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Ambiente</label>
                  <select
                    value={formData.environment}
                    onChange={e => setFormData({ ...formData, environment: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="production">Produção</option>
                    <option value="staging">Homologação / Staging</option>
                    <option value="backup">Backup / Disaster Recovery</option>
                    <option value="development">Desenvolvimento</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Observações</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-900/30"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Script de Instalação do Agente Remoto */}
      {isAgentModalOpen && selectedServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-[#0d131f] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Instalar Agente Multivus na VPS</h3>
              </div>
              <button onClick={() => setIsAgentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                Execute o comando abaixo no terminal da sua VPS <strong className="text-white">({selectedServer.name})</strong> para configurar a telemetria automática:
              </p>

              <div className="relative group">
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">
                  {getAgentInstallCommand(agentToken)}
                </pre>
                <button
                  onClick={() => copyToClipboard(getAgentInstallCommand(agentToken))}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Copiar Comando"
                >
                  {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> O que este instalador faz:
                </div>
                <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                  <li>Baixa o script coletor de telemetria em <code className="text-slate-300">/usr/local/bin/multivus-agent.sh</code></li>
                  <li>Configura o token individual com permissões restritas <code className="text-slate-300">chmod 700</code></li>
                  <li>Cria uma tarefa periódica no cron para envio a cada 1 minuto via HTTPS</li>
                  <li>Dispara o primeiro heartbeat imediatamente</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsAgentModalOpen(false);
                    refreshServers();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Concluir & Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Exclusão com confirmação */}
      {isDeleteModalOpen && selectedServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0d131f] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-red-500/10 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-sm font-bold">Confirmar Exclusão de Servidor</h3>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                Tem certeza que deseja remover o cadastro do servidor <strong className="text-white">{selectedServer.name}</strong> ({selectedServer.ip_address})?
              </p>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteHistory}
                    onChange={(e) => setDeleteHistory(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-red-500 focus:ring-0"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200">Excluir também o histórico de métricas</span>
                    <p className="text-[10px] text-slate-500">
                      Remove todas as métricas salvas, checkups e incidentes deste servidor. Se desmarcado, os registros históricos são preservados no banco.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteServer}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-900/40"
                >
                  {isSubmitting ? 'Removendo...' : 'Sim, Excluir Servidor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
