
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotificationBell = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Buscar notificações ativas
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar notificações lidas pelo usuário
  const { data: readNotifications = [] } = useQuery({
    queryKey: ['user-notifications-read', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_notifications_read')
        .select('notification_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(item => item.notification_id);
    },
    enabled: !!user?.id,
  });

  // Marcar notificação como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('User not found');
      
      const { error } = await supabase
        .from('user_notifications_read')
        .insert({
          user_id: user.id,
          notification_id: notificationId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications-read'] });
    },
  });

  // Calcular notificações não lidas
  const unreadNotifications = notifications.filter(
    notification => !readNotifications.includes(notification.id)
  );

  const handleNotificationClick = (notificationId: string) => {
    if (!readNotifications.includes(notificationId)) {
      markAsReadMutation.mutate(notificationId);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 w-9 sm:h-10 sm:w-10 p-0 relative text-gray-500 hover:bg-white/20 touch-manipulation"
        >
          <Bell className="h-5 w-5 text-gray-500" />
          {unreadNotifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
            >
              {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 border shadow-lg z-50" 
        align="center"
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Suas Notificações
          {unreadNotifications.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadNotifications.length} nova{unreadNotifications.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="mb-2">📭</div>
            <p className="text-sm">Nenhuma notificação no momento</p>
            <p className="text-xs text-gray-400 mt-1">
              Você será notificado sobre atualizações importantes
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const isUnread = !readNotifications.includes(notification.id);
            
            return (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer transition-colors ${
                  isUnread ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <h4 className={`font-medium text-sm ${getNotificationColor(notification.type)}`}>
                        {notification.title}
                      </h4>
                      {isUnread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 flex items-center gap-1">
                      <span>🕒</span>
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 text-center">
              <p className="text-xs text-gray-400">
                💡 Clique em uma notificação para marcá-la como lida
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
