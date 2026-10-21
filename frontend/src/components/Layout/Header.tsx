import React from 'react';
import { useMetrics } from '../../context/MetricsContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useServer } from '../../context/ServerContext';
import { ServerSelector } from '../Servers/ServerSelector';
import { 
  Server, 
  ShieldCheck, 
  FileText, 
  Sun, 
  Moon, 
  LogOut, 
  RefreshCw, 
  Activity,
  Globe
} from 'lucide-react';
import { reportApi } from '../../services/api';

interface HeaderProps {
  onOpenCheckup: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCheckup }) => {
  const { isLive, secondsAgo, refreshMetrics, isLoading } = useMetrics();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeServer, activeServerId } = useServer();

  const handleDownloadReport = () => {
    reportApi.downloadMarkdown();
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#090e18]/85 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between gap-3">
      {/* Left: Brand, Global Server Selector */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/10 border border-blue-500/30 flex items-center justify-center">
              <Server className="w-5 h-5 text-blue-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#090e18] rounded-full animate-pulse" />
          </div>
          <div className="hidden xl:block">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                VPS MULTIVUS
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Fleet Manager
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Global Server Selector Dropdown */}
        <div className="shrink-0">
          <ServerSelector />
        </div>
      </div>

      {/* Right: Actions, Refresh, Checkup, Profile */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Live Pulse info */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-400 font-mono">
          <Activity className={`w-3.5 h-3.5 ${isLive ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          <span>{isLive ? 'Tempo Real' : 'Sincronizado'}</span>
          <span className="text-slate-600">|</span>
          <span>há {secondsAgo}s</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={refreshMetrics}
          disabled={isLoading}
          title="Recarregar Métricas"
          className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Checkup Action Button */}
        <button
          onClick={onOpenCheckup}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all hover:scale-[1.02]"
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Executar Checkup</span>
        </button>

        {/* Report Download */}
        <button
          onClick={handleDownloadReport}
          title="Gerar e Baixar Relatório"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Relatório</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Alternar Tema"
          className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-amber-300 transition-colors hidden sm:flex"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-slate-200">{user?.username || 'Admin'}</div>
            <div className="text-[10px] text-slate-500 capitalize">{user?.role || 'DevOps'}</div>
          </div>
          <button
            onClick={logout}
            title="Sair do Sistema"
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
