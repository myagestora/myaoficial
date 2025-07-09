
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, PieChart, Target, Calendar, FolderOpen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SidebarProps {
  className?: string;
}

const navigationItems = [{
  name: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard
}, {
  name: 'Transações',
  href: '/transactions',
  icon: CreditCard
}, {
  name: 'Relatórios',
  href: '/reports',
  icon: PieChart
}, {
  name: 'Metas',
  href: '/goals',
  icon: Target
}, {
  name: 'Agendadas',
  href: '/scheduled',
  icon: Calendar
}, {
  name: 'Categorias',
  href: '/categories',
  icon: FolderOpen
}];

export const Sidebar = ({
  className
}: SidebarProps) => {
  // Buscar logo do sistema
  const {
    data: logoUrl
  } = useQuery({
    queryKey: ['system-config-logo'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('system_config').select('value').eq('key', 'app_logo').maybeSingle();
        if (error) {
          console.error('Error fetching logo:', error);
          return null;
        }
        const logoValue = data?.value;
        if (typeof logoValue === 'string') {
          return logoValue.replace(/^"|"$/g, '');
        }
        return logoValue ? JSON.stringify(logoValue).replace(/^"|"$/g, '') : null;
      } catch (error) {
        console.error('Error in logo query:', error);
        return null;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Buscar cor primária do sistema
  const {
    data: primaryColor
  } = useQuery({
    queryKey: ['system-config-primary-color'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('system_config').select('value').eq('key', 'primary_color').maybeSingle();
        if (error) {
          console.error('Error fetching primary color:', error);
          return '#222222'; // cor padrão
        }
        const colorValue = data?.value;
        if (typeof colorValue === 'string') {
          return colorValue.replace(/^"|"$/g, '');
        }
        return colorValue ? JSON.stringify(colorValue).replace(/^"|"$/g, '') : '#222222';
      } catch (error) {
        console.error('Error in primary color query:', error);
        return '#222222';
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Buscar frase motivacional aleatória
  const {
    data: motivationalPhrase
  } = useQuery({
    queryKey: ['motivational-phrase'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('motivational_phrases').select('phrase').eq('is_active', true);
        if (error) {
          console.error('Error fetching motivational phrases:', error);
          return 'Continue focado em seus objetivos!';
        }
        if (data && data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length);
          return data[randomIndex].phrase;
        }
        return 'Continue focado em seus objetivos!';
      } catch (error) {
        console.error('Error in motivational phrase query:', error);
        return 'Continue focado em seus objetivos!';
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  return <div className={cn("pb-12 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700", className)}>
      <div className="space-y-4 py-4">
        {/* Header com logo - fundo branco */}
        <div className="px-4 py-6 bg-white">
          <div className="flex flex-col items-center space-y-3">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" onError={e => {
            console.error('Erro ao carregar logo:', logoUrl);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }} />}
          </div>
        </div>

        {/* Frase motivacional */}
        {motivationalPhrase && <div className="px-4 py-3 mx-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center italic">
              "{motivationalPhrase}"
            </p>
          </div>}

        {/* Menu de navegação */}
        <div className="px-3 py-2">
          <div className="space-y-1">
            {navigationItems.map(item => <NavLink key={item.name} to={item.href} className={({
            isActive
          }) => cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "text-white font-semibold" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800")} style={({
            isActive
          }) => ({
            backgroundColor: isActive ? primaryColor || '#222222' : undefined
          })}>
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>)}
            
            <NavLink to="/settings" className={({
            isActive
          }) => cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "text-white font-semibold" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800")} style={({
            isActive
          }) => ({
            backgroundColor: isActive ? primaryColor || '#222222' : undefined
          })}>
              <Settings className="h-5 w-5" />
              Configurações
            </NavLink>
          </div>
        </div>
      </div>
    </div>;
};
