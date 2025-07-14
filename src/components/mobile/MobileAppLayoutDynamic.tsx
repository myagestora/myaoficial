import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, CreditCard, Target, BarChart3, Settings, Calendar, FolderOpen } from 'lucide-react';
import { PWAFloatingButton } from './PWAFloatingButton';
import { getStorageUrl, supabase } from '@/integrations/supabase/client';

const navigationItems = [
  { icon: Home, label: 'Início', path: '/dashboard' },
  { icon: CreditCard, label: 'Transações', path: '/transactions' },
  { icon: Target, label: 'Metas', path: '/goals' },
  { icon: Calendar, label: 'Agendadas', path: '/scheduled' },
  { icon: FolderOpen, label: 'Categorias', path: '/categories' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export const MobileAppLayoutDynamic = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Buscar configuração do logo
        const { data: configs } = await supabase
          .from('system_config')
          .select('key, value')
          .eq('key', 'app_logo')
          .single();

        if (configs?.value) {
          const logoValue = typeof configs.value === 'string' 
            ? configs.value 
            : JSON.stringify(configs.value);
          setLogoUrl(logoValue);
        } else {
          // Usar logo padrão com URL dinâmica
          const defaultLogo = await getStorageUrl('logos', 'logo-1751933896307.png');
          setLogoUrl(defaultLogo);
        }
      } catch (error) {
        console.warn('Error loading logo:', error);
        // Fallback para URL estática
        setLogoUrl('https://fimgalqlsezgxqbmktpz.supabase.co/storage/v1/object/public/logos/logo-1751933896307.png');
      }
    };

    loadLogo();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="flex items-center space-x-3">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt="Mya Gestora" 
              className="h-12 w-auto object-contain"
            />
          )}
        </div>
        <PWAFloatingButton />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden pt-20 pb-20">
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};