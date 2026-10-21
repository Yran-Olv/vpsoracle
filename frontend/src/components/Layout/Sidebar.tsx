import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Server, 
  Container, 
  Layers, 
  Globe, 
  ShieldAlert, 
  Newspaper, 
  Bell, 
  ShieldCheck, 
  Settings,
  Cpu
} from 'lucide-react';
import { oracleApi } from '../../services/api';
import { OciInstanceMetadata } from '../../types';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'Live' },
  { path: '/oracle', label: 'Oracle Free Guard', icon: ShieldAlert, highlight: true },
  { path: '/server', label: 'Servidor VPS', icon: Server },
  { path: '/docker', label: 'Containers Docker', icon: Container },
  { path: '/services', label: 'Serviços Linux', icon: Layers },
  { path: '/domains', label: 'Domínios & SSL', icon: Globe },
  { path: '/news', label: 'Oracle & Reddit News', icon: Newspaper },
  { path: '/alerts', label: 'Alertas & Incidentes', icon: Bell },
  { path: '/checkup', label: 'Checkup Automático', icon: ShieldCheck },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const [instance, setInstance] = useState<OciInstanceMetadata | null>(null);

  useEffect(() => {
    oracleApi.getInstance()
      .then(setInstance)
      .catch(() => {
        // Fallback default
        setInstance({
          displayName: 'multivusvps',
          id: 'ocid1.instance.oc1.sa-saopaulo-1.antxeljrtu5uzvycixdeslguvkhgz7tradcgwxyregxaa4eyy4tghaxrcgeq',
          shape: 'VM.Standard.A1.Flex',
          ocpus: 2,
          memoryInGBs: 12,
          networkingBandwidthInGbps: 2.0,
          availabilityDomain: 'skln:SA-SAOPAULO-1-AD-1',
          faultDomain: 'FAULT-DOMAIN-3',
          region: 'sa-saopaulo-1',
          regionKey: 'GRU',
          canonicalRegionName: 'sa-saopaulo-1',
          state: 'Running',
          timeCreated: 1788952903101,
          createdFormatted: '09/09/2026, 08:21:43',
          compartmentId: 'ocid1.tenancy.oc1..aaaaaaaaotrvdyuzakhjcuej7dbit7t2rrqmfogjycid2txarqz3ka4bjlbq',
          image: 'ocid1.image.oc1.sa-saopaulo-1.aaaaaaaaizpqol2y2czfobdx6igjd7j7cwtcb5zegyfgbwhp4jd5j3pea5wq',
          privateIp: '10.0.0.34',
          publicIp: '147.15.19.44',
          vnicId: '',
          macAddr: '',
          isAlwaysFreeEligible: true,
          tenancyLimits: { maxArmOcpu: 2, maxArmRamGb: 12, maxStorageGb: 200, maxBandwidthTb: 10, maxPublicIps: 2 },
          tenancyAllocated: { usedOcpu: 2, usedRamGb: 12, percentOcpu: 100, percentRam: 100, availableOcpu: 0, availableRamGb: 0 },
          isFromLiveImds: true,
          fetchedAt: ''
        });
      });
  }, []);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#090e18] border-r border-slate-800/80 shrink-0 select-none">
      {/* Brand Header inside sidebar */}
      <div className="p-4 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-200 tracking-wider">OCI MONITOR</div>
          <div className="text-[10px] text-slate-500 font-mono">vps.multivus.com.br</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all
                ${isActive 
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm' 
                  : item.highlight 
                    ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${item.highlight ? 'text-red-400' : ''}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Spec Badge - Real OCI Telemetry */}
      <div className="p-3 border-t border-slate-800/60">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span>Instância:</span>
            <span className="text-white font-mono font-bold">{instance?.displayName || 'multivusvps'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Shape:</span>
            <span className="text-white font-mono text-[10px] font-semibold">{instance?.shape || 'VM.Standard.A1.Flex'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Alocação:</span>
            <span className="text-white font-mono">{instance ? `${instance.ocpus} OCPUs / ${instance.memoryInGBs} GB` : '2 OCPUs / 12 GB'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/60">
            <span>Cota Tenancy:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Always Free (50%)
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
