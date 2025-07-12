
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileLayout } from './MobileLayout';

interface AppLayoutProps {
  children?: React.ReactNode;
}

// Detecção simples e direta de mobile
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|mobile|phone|tablet/.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  const hasTouch = 'ontouchstart' in window;
  
  console.log('🔍 Detecção mobile:', { userAgent, isMobileUA, isSmallScreen, hasTouch });
  
  return isMobileUA || isSmallScreen || hasTouch;
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  // Detecção direta sem hook
  const isMobile = isMobileDevice();
  
  console.log('📱 É mobile?', isMobile);
  
  // Se for mobile, usar layout mobile dedicado
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  // Layout Desktop
  return (
    <div className="min-h-screen flex bg-background">
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border">
        <Sidebar />
      </div>
      
      <div className="flex-1 lg:ml-64">
        <Header onMenuClick={() => {}} />
        <main className="flex-1 overflow-auto p-4">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
