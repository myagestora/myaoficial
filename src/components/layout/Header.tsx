import React from 'react';
import { Bell, Menu, Settings, LogOut, Shield } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
interface HeaderProps {
  onMenuClick?: () => void;
}
export const Header = ({
  onMenuClick
}: HeaderProps) => {
  const {
    user,
    signOut,
    isAdmin
  } = useAuth();
  const {
    profile
  } = useProfile();
  const navigate = useNavigate();

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

  // Buscar número do WhatsApp do sistema
  const {
    data: whatsappNumber
  } = useQuery({
    queryKey: ['system-config-support-phone'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('system_config').select('value').eq('key', 'support_phone').maybeSingle();
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
    refetchOnWindowFocus: false
  });
  const formatPhoneNumber = (phone: string) => {
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Formato brasileiro: (XX) XXXXX-XXXX
    if (cleanPhone.length >= 11) {
      return `(${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`;
    }
    return phone;
  };
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  return <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 px-4 py-3 min-h-[60px] pt-safe backdrop-blur-sm" style={{
    backgroundColor: primaryColor || '#222222'
  }}>
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMenuClick} 
            className="lg:hidden text-white hover:bg-white/10 p-2 touch-manipulation"
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          {/* Logo/Brand area for mobile - optional */}
          <div className="lg:hidden">
            <h1 className="text-white font-semibold text-lg">MYA</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-white/10 touch-manipulation"
              >
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white text-sm">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-56 bg-white dark:bg-gray-800 border shadow-lg z-50" 
              align="end" 
              forceMount
              sideOffset={8}
            >
              <DropdownMenuItem 
                onClick={() => navigate('/settings')}
                className="cursor-pointer touch-manipulation p-3"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              {isAdmin && <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => navigate('/admin')}
                    className="cursor-pointer touch-manipulation p-3"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin</span>
                  </DropdownMenuItem>
                </>}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="cursor-pointer touch-manipulation p-3 text-red-600 hover:text-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>;
};