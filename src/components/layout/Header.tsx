import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Moon, Sun, User, LogOut, Settings, Shield } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme.tsx';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();

  // Buscar frase motivacional aleatória
  const { data: motivationalPhrase } = useQuery({
    queryKey: ['motivational-phrase'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivational_phrases')
        .select('phrase')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const phrases = data as Array<{ phrase: string; }>;
      if (phrases.length > 0) {
        const randomIndex = Math.floor(Math.random() * phrases.length);
        return phrases[randomIndex].phrase;
      }
      return 'MYA está aqui para transformar sua vida financeira! 💰';
    }
  });

  // Buscar cor primária do sistema - corrigindo a busca
  const { data: primaryColor } = useQuery({
    queryKey: ['system-config-header'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'primary_color')
        .maybeSingle();
      
      if (error) throw error;

      // Extrair o valor corretamente do JSON
      const colorValue = data?.value;
      if (typeof colorValue === 'string') {
        return colorValue.replace(/^"|"$/g, '');
      }
      return JSON.stringify(colorValue).replace(/^"|"$/g, '') || '#3B82F6';
    }
  });

  return (
    <header className="h-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Primeira linha com controles */}
      <div 
        style={{ backgroundColor: primaryColor || '#3B82F6' }} 
        className="h-12 flex items-center justify-end px-6 bg-[#b998f3]"
      >
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-9 w-9 p-0 text-white hover:bg-white/20">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full text-white hover:bg-white/20">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatars/01.png" alt="Avatar" />
                  <AvatarFallback className="bg-white text-gray-900">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Usuário</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Painel Admin</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Segunda linha com frase motivacional */}
      <div className="h-8 flex items-center justify-center px-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium text-center animate-pulse">
          {motivationalPhrase}
        </p>
      </div>
    </header>
  );
};
