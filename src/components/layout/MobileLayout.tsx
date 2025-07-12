import React, { useState, useEffect } from 'react';
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

  // Configurações específicas para mobile
  useEffect(() => {
    // Prevenir zoom em inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      (input as HTMLElement).style.fontSize = '16px';
    });

    // Prevenir zoom duplo toque
    let lastTouchEnd = 0;
    const preventZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    
    document.addEventListener('touchend', preventZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchend', preventZoom);
    };
  }, []);

  return (
    <div className="h-screen h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header fixo mobile */}
      <div className="flex-shrink-0">
        <Header onMenuClick={handleMenuClick} />
      </div>
      
      {/* Conteúdo principal mobile - rolável com padding top para header fixo */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-[60px]">
        <div className="p-4 pb-8 min-h-full">
          {children || <Outlet />}
        </div>
      </main>
      
      {/* Sidebar Mobile */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-[300px] h-full overflow-hidden z-[60] bg-background"
        >
          <div className="h-full overflow-y-auto">
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};