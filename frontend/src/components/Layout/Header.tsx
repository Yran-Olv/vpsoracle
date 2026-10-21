import React from 'react';
import { useMetrics } from '../../context/MetricsContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { metrics, isLive, secondsAgo, refreshMetrics, isLoading } = useMetrics();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleDownloadReport = () => {
    reportApi.downloadMarkdown();
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#090e18]/85 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between">
      {/* Left: Brand and Status */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 via-orange-500/20 to-amber-500/10 border border-red-500/30 flex items-center justify-center">
              <Server className="w-5 h-5 text-red-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#090e18] rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                VPS MULTIVUS
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hidden sm:inline-block">
                  Oracle Always Free
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                ONLINE
              </span>
              <span className="hidden md:inline text-slate-600">•</span>
              <span className="hidden md:flex items-center gap-1 text-slate-400">
                <Globe className="w-3 h-3 text-blue-400" />
                147.15.19.44 (vps.multivus.com.br)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions, Refresh, Checkup, Profile */}
      <div className="flex items-center gap-2 md:gap-3">
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
