
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  PieChart, 
  Target, 
  Calendar,
  FolderOpen,
  FileText,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  className?: string;
  disableNavigation?: boolean;
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Transações',
    href: '/transactions',
    icon: CreditCard,
  },
  {
    name: 'Relatórios',
    href: '/reports',
    icon: PieChart,
  },
  {
    name: 'Metas',
    href: '/goals',
    icon: Target,
  },
  {
    name: 'Agendadas',
    href: '/scheduled',
    icon: Calendar,
  },
  {
    name: 'Categorias',
    href: '/categories',
    icon: FolderOpen,
  },
];

export const Sidebar = ({ className, disableNavigation = false }: SidebarProps) => {
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

  const isNavigationDisabled = disableNavigation && !hasSubscription;

  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.name}
                to={isNavigationDisabled ? '#' : item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive && !isNavigationDisabled
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                    isNavigationDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                  )
                }
                onClick={(e) => {
                  if (isNavigationDisabled) {
                    e.preventDefault();
                  }
                }}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                {isNavigationDisabled && (
                  <span className="ml-auto text-xs text-orange-600">🔒</span>
                )}
              </NavLink>
            ))}
            
            <NavLink
              to={isNavigationDisabled ? '#' : '/settings'}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive && !isNavigationDisabled
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                  isNavigationDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
                )
              }
              onClick={(e) => {
                if (isNavigationDisabled) {
                  e.preventDefault();
                }
              }}
            >
              <Settings className="h-5 w-5" />
              Configurações
              {isNavigationDisabled && (
                <span className="ml-auto text-xs text-orange-600">🔒</span>
              )}
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};
