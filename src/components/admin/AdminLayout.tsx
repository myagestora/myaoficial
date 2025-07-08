import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  BarChart3, 
  CreditCard,
  Bell,
  Zap,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const adminNavigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Relatórios', href: '/admin/reports', icon: BarChart3 },
  { name: 'Assinaturas', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Notificações', href: '/admin/notifications', icon: Bell },
  { name: 'Sistema', href: '/admin/system', icon: Zap },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

export const AdminLayout = () => {
  const location = useLocation();

  // Buscar configurações do sistema para logo e nome
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .in('key', ['app_name', 'app_logo']);
      
      if (error) throw error;
      
      const configObj: Record<string, string> = {};
      data.forEach(item => {
        configObj[item.key] = typeof item.value === 'string' ? 
          item.value.replace(/^"|"$/g, '') : 
          JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      return configObj;
    }
  });

  const appName = systemConfig?.app_name || 'MYA Gestora';
  const appLogo = systemConfig?.app_logo;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center">
              {appLogo && appLogo.trim() !== '' ? (
                <img 
                  src={appLogo} 
                  alt={appName}
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              
              <div 
                className={`flex items-center space-x-3 logo-fallback ${appLogo && appLogo.trim() !== '' ? 'hidden' : ''}`}
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {appName}
                </span>
              </div>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white text-center">
            Painel Admin
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Gerenciamento do sistema
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {adminNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.name} to={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive ? "bg-primary text-primary-foreground" : ""
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Back to App */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Link to="/dashboard">
            <Button variant="outline" className="w-full">
              Voltar ao App
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};
