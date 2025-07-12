
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
          <Sidebar />
        </div>
      )}
      
      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-80 sm:w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>
      )}
      
      <div className={`flex-1 ${!isMobile ? 'lg:ml-64' : ''}`}>
        <Header onMenuClick={handleMenuClick} />
        <main className="flex-1 overflow-auto p-4 pb-20 sm:pb-4">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
