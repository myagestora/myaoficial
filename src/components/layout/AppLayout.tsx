
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout = ({
  children
}: AppLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleMenuClick = () => {
    setMobileMenuOpen(true);
  };

  // Auto fechar sidebar quando navegar (será implementado via NavLink)
  const handleNavigate = () => {
    setMobileMenuOpen(false);
  };

  // Configurar viewport para mobile app-like
  useEffect(() => {
    if (isMobile) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
      
      // Prevenir zoom duplo toque
      let lastTouchEnd = 0;
      const preventZoom = (e: TouchEvent) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      };
      
      document.addEventListener('touchend', preventZoom, { passive: false });
      
      return () => {
        document.removeEventListener('touchend', preventZoom);
      };
    }
  }, [isMobile]);

  if (!isMobile) {
    // Layout Desktop
    return (
      <div className="min-h-screen flex bg-background">
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border">
          <Sidebar />
        </div>
        
        <div className="flex-1 lg:ml-64">
          <Header onMenuClick={handleMenuClick} />
          <main className="flex-1 overflow-auto p-4">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    );
  }

  // Layout Mobile - App-like
  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      {/* Header fixo */}
      <Header onMenuClick={handleMenuClick} />
      
      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto pb-safe">
        <div className="p-4 pb-6">
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
