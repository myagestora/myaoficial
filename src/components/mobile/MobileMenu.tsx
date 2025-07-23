import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  Target, 
  BarChart3, 
  Calendar, 
  Grid3X3, 
  Settings,
  X,
  Download,
  LogOut,
  Banknote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isIOSDevice } from '@/utils/mobileDetection';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';


interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/transactions', icon: CreditCard, label: 'Transações' },
  { path: '/goals', icon: Target, label: 'Metas' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
];

const moreItems = [
  { path: '/scheduled', icon: Calendar, label: 'Agendadas' },
  { path: '/categories', icon: Grid3X3, label: 'Categorias' },
  { path: '/accounts', icon: Banknote, label: 'Contas' },
  { path: '/cards', icon: CreditCard, label: 'Cartões' },
  { path: '/settings', icon: Settings, label: 'Configurações' },
];

export const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isIOS = isIOSDevice();
  
  // Debug visual para Android
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = /android/i.test(userAgent);
  const menuVersion = "v8-android-fix";
  const debugTimestamp = Date.now();

  // Buscar logo do sistema
  const [logoUrl, setLogoUrl] = useState('');
  useEffect(() => {
    const loadLogo = async () => {
      try {
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
          setLogoUrl('https://api.myagestora.com.br/storage/v1/object/public/logos/logo-1751933896307.png');
        }
      } catch (error) {
        setLogoUrl('https://api.myagestora.com.br/storage/v1/object/public/logos/logo-1751933896307.png');
      }
    };
    loadLogo();
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };



  // Prevenir scroll do body quando menu está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Menu Content - novo layout */}
      <div 
        className={cn(
          "absolute left-0 top-0 h-full w-80 bg-white border-r shadow-2xl flex flex-col",
          "transition-transform duration-300 ease-out",
          isIOS && "mobile-menu-ios",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header com logo e botão fechar */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/0">
          {logoUrl ? (
            <img src={logoUrl.trim().replace(/^"|"$/g, '')} alt="Logo" className="h-10 w-auto object-contain max-w-[90px]" />
          ) : (
            <div className="h-10 w-24 bg-gray-100 rounded" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 text-primary hover:bg-primary/10"
          >
            <X size={24} />
          </Button>
        </div>
        {/* Navegação principal */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {[...navigationItems, ...moreItems].map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "flex items-center gap-4 w-full px-4 py-2 rounded-xl text-left transition-all",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary font-semibold shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon size={24} className={location.pathname === item.path ? 'text-primary' : 'text-gray-400'} />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </button>
          ))}
        </nav>
        {/* Footer fixo com botão de logout */}
        <div className="p-5 border-t bg-gradient-to-r from-primary/5 to-primary/0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-destructive bg-destructive/10 hover:bg-destructive/20 font-semibold text-base shadow-sm"
          >
            <LogOut size={22} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};