
import React from 'react';
import { Bell, Menu, Settings, User, LogOut, Shield } from 'lucide-react';
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
  disableNavigation?: boolean;
}

export const Header = ({ onMenuClick, disableNavigation = false }: HeaderProps) => {
  const { user, signOut, isAdmin } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

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

  const handleNavigation = (path: string) => {
    if (disableNavigation && !hasSubscription) {
      return; // Bloqueia navegação se não tem assinatura
    }
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
            disabled={disableNavigation && !hasSubscription}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Mya Gestora
            </h1>
            {(!hasSubscription && disableNavigation) && (
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                Assinatura Necessária
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 
                     user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem 
                onClick={() => handleNavigation('/settings')}
                disabled={disableNavigation && !hasSubscription}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleNavigation('/settings')}
                disabled={disableNavigation && !hasSubscription}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleNavigation('/admin')}
                    disabled={disableNavigation && !hasSubscription}
                  >
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
