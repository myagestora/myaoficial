
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileLayout } from './MobileLayout';

interface AppLayoutProps {
  children?: React.ReactNode;
}

// Detecção agressiva de mobile
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|mobile|phone|tablet|webos|opera mini|fennec|iemobile|windows phone/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 768;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasOrientation = typeof window.orientation !== 'undefined';
  
  // Forçar mobile se qualquer condição for verdadeira
  const isMobile = isMobileUA || isSmallScreen || hasTouch || hasOrientation;
  
  console.log('🔍 Detecção mobile forçada:', { 
    userAgent, 
    isMobileUA, 
    isSmallScreen, 
    hasTouch, 
    hasOrientation,
    finalResult: isMobile 
  });
  
  // Aplicar classe mobile no body se for mobile
  if (isMobile) {
    document.body.classList.add('mobile-device');
    document.documentElement.classList.add('mobile-device');
    console.log('✅ Classes mobile aplicadas!');
  }
  
  return isMobile;
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
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border">
        <Sidebar />
      </div>
      
      <div className="lg:ml-64">
        <Header onMenuClick={() => {}} />
        <main className="p-4">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
