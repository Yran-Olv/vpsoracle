import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { CheckupModal } from '../Checkup/CheckupModal';

export const Layout: React.FC = () => {
  const [isCheckupOpen, setIsCheckupOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b12] text-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenCheckup={() => setIsCheckupOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 space-y-6">
          <Outlet context={{ onOpenCheckup: () => setIsCheckupOpen(true) }} />
        </main>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>

      {/* Global Checkup Diagnostic Modal */}
      <CheckupModal isOpen={isCheckupOpen} onClose={() => setIsCheckupOpen(false)} />
    </div>
  );
};
