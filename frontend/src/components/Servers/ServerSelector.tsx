import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServer } from '../../context/ServerContext';
import { 
  Server, 
  ChevronDown, 
  Check, 
  Layers, 
  PlusCircle, 
  ExternalLink,
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import { ServerItem } from '../../types';

export const ServerSelector: React.FC = () => {
  const { servers, activeServerId, activeServer, setActiveServerId } = useServer();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'oracle':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-400" />;
      case 'aws':
        return <HardDrive className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Server className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const getStatusColor = (server: ServerItem) => {
    if (server.status === 'disabled') return 'bg-slate-500';
    if (server.connection_type === 'local') return 'bg-emerald-400';
    if (!server.last_seen_at) return 'bg-amber-400';
    const lastSeen = new Date(server.last_seen_at).getTime();
    const isRecent = Date.now() - lastSeen < 120000; // 2 minutes
    return isRecent ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400';
  };

  const currentLabel = activeServerId === 'all'
    ? 'Todos os Servidores (Frota)'
    : (activeServer?.name || 'Servidor Selecionado');

  const currentSub = activeServerId === 'all'
    ? `${servers.length} VPS conectadas`
    : (activeServer?.ip_address || '147.15.19.44');

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 text-left transition-all shadow-sm group"
      >
        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
          {activeServerId === 'all' ? (
            <Layers className="w-4 h-4 text-purple-400" />
          ) : (
            getProviderIcon(activeServer?.provider || 'generic')
          )}
        </div>

        <div className="hidden sm:block min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-100 truncate max-w-[150px] md:max-w-[200px]">
              {currentLabel}
            </span>
            {activeServer && (
              <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(activeServer)}`} />
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] md:max-w-[200px]">
            {currentSub}
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 rounded-2xl bg-[#0d131f] border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-800/80 bg-slate-900/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
              Seletor de VPS / Frota
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
            {/* Option: Todos os Servidores */}
            <button
              onClick={() => {
                setActiveServerId('all');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                activeServerId === 'all'
                  ? 'bg-purple-500/15 text-purple-200 border border-purple-500/30'
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold">Todos os Servidores</div>
                  <div className="text-[10px] text-slate-400">Visão consolidada da frota ({servers.length} VPS)</div>
                </div>
              </div>
              {activeServerId === 'all' && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
            </button>

            <div className="border-t border-slate-800/60 my-1" />

            {/* Individual Servers */}
            {servers.map((s) => {
              const isSelected = activeServerId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveServerId(s.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-600/15 text-blue-200 border border-blue-500/30'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
                      {getProviderIcon(s.provider)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate max-w-[130px]">{s.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(s)}`} />
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <span>{s.ip_address}</span>
                        <span className="text-slate-600">•</span>
                        <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                          {s.environment}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Quick link to manage servers */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-900/60">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/servers');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Gerenciar & Adicionar VPS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
