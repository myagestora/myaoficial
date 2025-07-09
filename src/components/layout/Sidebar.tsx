
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  PieChart, 
  Target, 
  Calendar,
  FolderOpen,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
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

export const Sidebar = ({ className }: SidebarProps) => {
  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
            
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                )
              }
            >
              <Settings className="h-5 w-5" />
              Configurações
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};
