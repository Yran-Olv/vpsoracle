import React, { useState } from 'react';
import { OciInstanceMetadata } from '../../types';
import { 
  Server, 
  Cpu, 
  Database, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  MapPin, 
  Clock, 
  Network
} from 'lucide-react';

interface OciInstanceCardProps {
  instance: OciInstanceMetadata | null;
  isLoading?: boolean;
}

export const OciInstanceCard: React.FC<OciInstanceCardProps> = ({ instance, isLoading }) => {
  const [copiedOcid, setCopiedOcid] = useState(false);

  if (isLoading || !instance) {
    return (
      <div className="p-6 rounded-2xl glass-card animate-pulse space-y-4">
        <div className="h-6 w-56 bg-slate-800 rounded"></div>
        <div className="h-32 bg-slate-800/60 rounded-xl"></div>
      </div>
    );
  }

  const handleCopyOcid = () => {
    navigator.clipboard.writeText(instance.id);
    setCopiedOcid(true);
    setTimeout(() => setCopiedOcid(false), 2000);
  };

  const ociConsoleUrl = `https://cloud.oracle.com/compute/instances/${instance.id}`;

  return (
    <div className="rounded-2xl glass-card border border-slate-800 p-5 md:p-6 space-y-5 bg-gradient-to-br from-[#0c1322] to-[#070b14]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Server className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                Instância OCI: {instance.displayName}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {instance.state}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${instance.isFromLiveImds ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${instance.isFromLiveImds ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                {instance.isFromLiveImds ? 'IMDSv2 Online' : (instance.imdsStatus === 'STALE' ? 'IMDSv2 Cache' : 'Telemetria')}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                {instance.shape}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {instance.isFromLiveImds 
                ? 'Dados em tempo real via Oracle Instance Metadata Service (IMDS v2)' 
                : `Telemetria preservada da última leitura válida (${instance.lastValidFetchAt && instance.lastValidFetchAt !== 'Desconhecido' ? new Date(instance.lastValidFetchAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Local'})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={ociConsoleUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
          >
            <span>Abrir no Oracle Cloud</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Instance Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium block">Shape Alocado</span>
          <span className="text-xs font-mono font-bold text-white block truncate">{instance.shape}</span>
          <span className="text-[10px] text-emerald-400 font-mono block">Ampere A1 ARM</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium block">OCPUs Alocadas</span>
          <span className="text-xs font-mono font-bold text-white block">{instance.ocpus} OCPUs</span>
          <span className="text-[10px] text-slate-400 font-mono block">Cota: {instance.tenancyLimits?.maxArmOcpu ?? 2} OCPUs ({instance.tenancyAllocated.percentOcpu}%)</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium block">Memória RAM</span>
          <span className="text-xs font-mono font-bold text-white block">{instance.memoryInGBs} GB RAM</span>
          <span className="text-[10px] text-slate-400 font-mono block">Cota: {instance.tenancyLimits?.maxArmRamGb ?? 12} GB ({instance.tenancyAllocated.percentRam}%)</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium block">IP Público / Privado</span>
          <span className="text-xs font-mono font-bold text-cyan-400 block truncate">{instance.publicIp}</span>
          <span className="text-[10px] text-slate-400 font-mono block truncate">{instance.privateIp}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium block">Domínio & Falha</span>
          <span className="text-xs font-mono font-bold text-white block">AD-1 (GRU)</span>
          <span className="text-[10px] text-slate-400 font-mono block">{instance.faultDomain}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-medium block">Criado em</span>
          <span className="text-xs font-mono font-bold text-white block truncate">09/09/2026</span>
          <span className="text-[10px] text-slate-400 font-mono block">11:21 UTC</span>
        </div>
      </div>

      {/* Tenancy Always Free Quota Comparison */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">Balanço da Cota Tenancy Always Free (Ampere A1)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Disponível para novas VMs: <strong className="text-emerald-400">{instance.tenancyAllocated.availableOcpu} OCPUs</strong> / <strong className="text-emerald-400">{instance.tenancyAllocated.availableRamGb} GB RAM</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* OCPU Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">OCPUs Utilizadas nesta VM</span>
              <span className="text-white font-bold">{instance.ocpus} de {instance.tenancyLimits?.maxArmOcpu ?? 2} OCPUs ({instance.tenancyAllocated.percentOcpu}%)</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${instance.tenancyAllocated.percentOcpu > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
                style={{ width: `${Math.min(100, instance.tenancyAllocated.percentOcpu)}%` }}
              />
            </div>
          </div>

          {/* RAM Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">RAM Utilizada nesta VM</span>
              <span className="text-white font-bold">{instance.memoryInGBs} de {instance.tenancyLimits?.maxArmRamGb ?? 12} GB ({instance.tenancyAllocated.percentRam}%)</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${instance.tenancyAllocated.percentRam > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-400'}`}
                style={{ width: `${Math.min(100, instance.tenancyAllocated.percentRam)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* OCID & Technical Identity Box */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-500 font-bold shrink-0">OCID:</span>
          <span className="text-slate-300 truncate text-[11px] select-all">{instance.id}</span>
        </div>
        <button
          onClick={handleCopyOcid}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans font-medium shrink-0 transition-colors self-start sm:self-auto"
        >
          {copiedOcid ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar OCID</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
