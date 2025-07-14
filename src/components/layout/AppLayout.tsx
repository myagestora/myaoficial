
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {

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
