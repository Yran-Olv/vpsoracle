import React, { useState, useEffect } from 'react';
import { settingsApi, authApi } from '../services/api';
import { Settings, Save, Lock, Clock, Shield, Bell, Check, Globe } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    settingsApi.get().then((res) => {
      setSettings(res);
      setIsLoading(false);
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await settingsApi.save(settings);
    setSavedMessage('Configurações salvas com sucesso!');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.error || 'Erro ao alterar senha.' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-300" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Configurações do Sistema</h1>
          <p className="text-xs text-slate-400">
            Ajustes de coleta, retenção de métricas, timezone e segurança
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* 1. General Monitoring Settings */}
      <form onSubmit={handleSaveSettings} className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Clock className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">Parâmetros de Coleta & Retenção</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Intervalo de Coleta de Métricas (Segundos)</label>
            <input
              type="number"
              value={settings['metrics_interval_sec'] || '10'}
              onChange={(e) => setSettings({ ...settings, metrics_interval_sec: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Intervalo de Healthcheck de Domínios (Segundos)</label>
            <input
              type="number"
              value={settings['health_interval_sec'] || '30'}
              onChange={(e) => setSettings({ ...settings, health_interval_sec: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Retenção de Métricas Detalhadas (Dias)</label>
            <input
              type="number"
              value={settings['raw_retention_days'] || '7'}
              onChange={(e) => setSettings({ ...settings, raw_retention_days: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Retenção de Métricas Agregadas (Dias)</label>
            <input
              type="number"
              value={settings['hourly_retention_days'] || '90'}
              onChange={(e) => setSettings({ ...settings, hourly_retention_days: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Timezone do Sistema</label>
            <input
              type="text"
              value={settings['timezone'] || 'America/Sao_Paulo'}
              disabled
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Webhook URL para Notificações (Discord / Telegram)</label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={settings['webhook_url'] || ''}
              onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800/60">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>

      {/* 2. Security & Password Change */}
      <form onSubmit={handleChangePassword} className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Lock className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Segurança & Alteração de Senha</h2>
        </div>

        {passwordMsg && (
          <div className={`p-3 rounded-xl border text-xs ${
            passwordMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {passwordMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Senha Atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Nova Senha (Mínimo 6 caracteres)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800/60">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Atualizar Senha</span>
          </button>
        </div>
      </form>
    </div>
  );
};
