import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MobileRouteHandler } from './MobileRouteHandler';
import { MobileMenu } from './MobileMenu';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { 
  Home, 
  CreditCard, 
  Target, 
  BarChart3, 
  Menu,
  Calendar // Adicionar o ícone Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';


interface MobileAppLayoutProps {
  children?: React.ReactNode;
}

const navigationItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/transactions', icon: CreditCard, label: 'Transações' },
  { path: '/goals', icon: Target, label: 'Metas' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
  { path: '/scheduled', icon: Calendar, label: 'Agendadas' }, // Novo item
];

export const MobileAppLayout = ({ children }: MobileAppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentPath = location.pathname;

  // Buscar número do WhatsApp do sistema
  const { data: whatsappNumber } = useQuery({
    queryKey: ['system-config-support-phone'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('system_config').select('value').eq('key', 'support_phone').maybeSingle();
        if (error) return null;
        const numberValue = data?.value;
        if (typeof numberValue === 'string') {
          return numberValue.replace(/^"|"$/g, '').replace(/\+/, '');
        }
        return numberValue ? JSON.stringify(numberValue).replace(/^"|"$/g, '').replace(/\+/, '') : null;
      } catch {
        return null;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  const formatPhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 11) {
      return `(${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`;
    }
    return phone;
  };

  const NavItem = ({ path, icon: Icon, label, onClick }: {
    path: string;
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
  }) => {
    const isActive = currentPath === path;
    
    return (
      <button
        onClick={() => {
          navigate(path);
          onClick?.();
        }}
        className={cn(
          "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
          "min-h-[60px] flex-1",
          isActive 
            ? "bg-primary-foreground/20 text-primary-foreground" 
            : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
        )}
      >
        <Icon size={20} className="mb-1" />
        <span className="text-xs font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - Agora não fixo */}
      <header className="grid grid-cols-[1fr_2.2fr_0.7fr_0.7fr] items-center p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Logo à esquerda */}
        <div className="flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <img 
              src="https://api.myagestora.com.br/storage/v1/object/public/logos/logo-1751933896307.png" 
              alt="Mya Gestora" 
              className="h-12 w-auto object-contain"
            />
          </button>
        </div>
        {/* WhatsApp centralizado e maior */}
        <div className="flex flex-col items-center justify-center">
          <a
            href={`https://wa.me/${whatsappNumber || '5531973035490'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center"
            style={{ textDecoration: 'none' }}
          >
            <span className="flex items-center gap-1">
              <WhatsAppIcon size={18} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700">
                {whatsappNumber ? formatPhoneNumber(whatsappNumber) : '(31) 97303-5490'}
              </span>
            </span>
            <span className="text-[11px] text-green-700 font-medium mt-0.5">Use pelo WhatsApp</span>
          </a>
        </div>
        {/* Notificações */}
        <div className="flex items-center justify-center">
          <NotificationBell />
        </div>
        {/* Menu hamburguer */}
        <div className="flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10"
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu size={20} />
          </Button>
        </div>
      </header>

      {/* Main Content - Remover padding do topo */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="p-4">
          {children || <MobileRouteHandler />}
        </div>
      </main>

      {/* Bottom Navigation - Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 bg-primary backdrop-blur supports-[backdrop-filter]:bg-primary border-t border-primary-foreground/20 p-2 z-40">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navigationItems.map((item) => (
            <NavItem
              key={item.path}
              path={item.path}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>
      </nav>


      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
      />

      {/* Install Prompt */}
      
    </div>
  );
};