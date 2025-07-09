
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user } = useAuth();

  // Verificar se tem assinatura ativa
  const { data: hasSubscription } = useQuery({
    queryKey: ['user-active-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      return !!subscription;
    },
    enabled: !!user?.id
  });

  const disableNavigation = !hasSubscription;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <div className="hidden lg:block">
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <Sidebar disableNavigation={disableNavigation} />
        </div>
      </div>
      
      <div className="flex-1 lg:ml-64">
        <Header disableNavigation={disableNavigation} />
        <main className="flex-1 overflow-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
