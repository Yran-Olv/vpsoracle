import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Server, 
  ShieldAlert, 
  HardDrive, 
  Container, 
  Layers,
  Globe, 
  ShieldCheck, 
  Settings 
} from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { path: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { path: '/servers', label: 'Servidores', icon: Server },
  { path: '/oracle', label: 'Free Guard', icon: ShieldAlert },
  { path: '/server', label: 'Métricas', icon: HardDrive },
  { path: '/docker', label: 'Docker', icon: Container },
  { path: '/services', label: 'Serviços', icon: Layers },
  { path: '/domains', label: 'Domínios', icon: Globe },
  { path: '/checkup', label: 'Checkup', icon: ShieldCheck },
  { path: '/settings', label: 'Ajustes', icon: Settings },
];

export const MobileNav: React.FC = () => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090e18]/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around overflow-x-auto">
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center min-w-[50px] py-1 px-1.5 rounded-lg text-[10px] font-medium transition-colors
              ${isActive 
                ? 'text-blue-400 font-semibold' 
                : 'text-slate-400 hover:text-slate-200'
              }
            `}
          >
            <Icon className="w-4 h-4 mb-0.5" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
