import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface MobileLayoutProps {
  children?: React.ReactNode;
}

export const MobileLayout = ({ children }: MobileLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenuClick = () => {
    setMobileMenuOpen(true);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      {/* Header fixo mobile */}
      <Header onMenuClick={handleMenuClick} />
      
      {/* Conteúdo principal mobile */}
      <main className="flex-1 overflow-auto">
        <div className="p-3 pb-6">
          {children || <Outlet />}
        </div>
      </main>
      
      {/* Sidebar Mobile */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-[280px] h-full overflow-hidden z-[60]"
        >
          <div className="h-full overflow-y-auto">
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};