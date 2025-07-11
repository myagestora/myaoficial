import React from 'react';
import { Bell, Menu, Settings, LogOut, Shield } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, signOut, isAdmin } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  // Buscar cor primária do sistema
  const { data: primaryColor } = useQuery({
    queryKey: ['system-config-primary-color'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'primary_color')
          .maybeSingle();
        
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
    refetchOnWindowFocus: false,
  });

  // Buscar número do WhatsApp do sistema
  const { data: whatsappNumber } = useQuery({
    queryKey: ['system-config-support-phone'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'support_phone')
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching support phone:', error);
          return null;
        }

        const numberValue = data?.value;
        if (typeof numberValue === 'string') {
          return numberValue.replace(/^"|"$/g, '').replace(/\+/, '');
        }
        return numberValue ? JSON.stringify(numberValue).replace(/^"|"$/g, '').replace(/\+/, '') : null;
      } catch (error) {
        console.error('Error in support phone query:', error);
        return null;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const formatPhoneNumber = (phone: string) => {
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Formato brasileiro: (XX) XXXXX-XXXX
    if (cleanPhone.length >= 11) {
      return `(${cleanPhone.slice(2,4)}) ${cleanPhone.slice(4,9)}-${cleanPhone.slice(9)}`;
    }
    return phone;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header 
      className="border-b border-gray-200 dark:border-gray-700 px-4 py-3"
      style={{ backgroundColor: primaryColor || '#222222' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden text-white hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* WhatsApp Contact Highlight */}
        <div className="hidden sm:flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-lg border border-gray-200">
          <WhatsAppIcon className="text-green-500" size={18} />
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 font-medium">Use pelo WhatsApp</span>
            <a 
              href={`https://wa.me/${whatsappNumber || '5511999999999'}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-900 font-semibold hover:text-green-600 transition-colors"
            >
              {whatsappNumber ? formatPhoneNumber(whatsappNumber) : '(11) 99999-9999'}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/10">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 
                     user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
