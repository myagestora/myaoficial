
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  Target, 
  Calendar, 
  BarChart3, 
  Settings,
  DollarSign,
  PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Transações', href: '/transactions', icon: CreditCard },
  { name: 'Metas', href: '/goals', icon: Target },
  { name: 'Agendamentos', href: '/scheduled', icon: Calendar },
  { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  { name: 'Categorias', href: '/categories', icon: PieChart },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();

  // Buscar configurações do sistema para logo, nome e cores - com cache mais curto para refletir mudanças
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config-sidebar'],
    queryFn: async () => {
      console.log('Buscando configurações do sistema...');
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .in('key', ['app_name', 'app_logo', 'secondary_color']);
      
      if (error) {
        console.error('Erro ao buscar configurações:', error);
        throw error;
      }
      
      console.log('Configurações encontradas:', data);
      
      const configObj: Record<string, string> = {};
      data.forEach(item => {
        configObj[item.key] = typeof item.value === 'string' ? 
          item.value.replace(/^"|"$/g, '') : 
          JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      console.log('Configurações processadas:', configObj);
      return configObj;
    },
    staleTime: 30000, // Cache por 30 segundos apenas
    gcTime: 60000, // Manter em cache por 1 minuto (nova nomenclatura)
  });

  const appName = systemConfig?.app_name || 'Controle Financeiro';
  const appLogo = systemConfig?.app_logo;
  const secondaryColor = systemConfig?.secondary_color || '#10B981';

  console.log('Logo URL no sidebar:', appLogo);
  console.log('Cor secundária:', secondaryColor);

  return (
    <div className="flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Logo */}
      <div className="flex items-center justify-center h-20 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center">
          {appLogo && appLogo.trim() !== '' ? (
            // Quando tem logo, mostra apenas o logo
            <img 
              src={appLogo} 
              alt={appName}
              className="h-15 w-auto object-contain"
              onError={(e) => {
                console.error('Erro ao carregar logo:', appLogo);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // Mostrar fallback com nome
                const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }}
              onLoad={() => {
                console.log('Logo carregada com sucesso:', appLogo);
              }}
            />
          ) : null}
          
          {/* Fallback: quando não tem logo ou erro no carregamento */}
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

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              style={isActive ? { backgroundColor: secondaryColor } : {}}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          © 2025 {systemConfig?.app_name || 'MYA Gestora'}
        </p>
      </div>
    </div>
  );
};
