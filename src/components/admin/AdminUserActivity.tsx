
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Users, Activity } from 'lucide-react';

interface AdminUserActivityProps {
  dateRange?: DateRange;
}

export const AdminUserActivity = ({ dateRange }: AdminUserActivityProps) => {
  const { data: userStats, isLoading } = useQuery({
    queryKey: ['admin-user-activity', dateRange],
    queryFn: async () => {
      console.log('👥 Buscando atividade de usuários...');
      
      let usersQuery = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          subscription_status,
          created_at,
          admin_override_status
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtro de período se especificado
      if (dateRange?.from && dateRange?.to) {
        usersQuery = usersQuery
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data: users, error: usersError } = await usersQuery.limit(10);
      
      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
        return { recentUsers: [], activeUsers: 0, inactiveUsers: 0 };
      }

      // Contar usuários ativos e inativos
      const activeUsers = users?.filter(u => u.subscription_status === 'active').length || 0;
      const inactiveUsers = users?.filter(u => u.subscription_status === 'inactive').length || 0;

      console.log('👥 Dados de atividade processados:', { activeUsers, inactiveUsers, totalUsers: users?.length });
      
      return {
        recentUsers: users || [],
        activeUsers,
        inactiveUsers
      };
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividade de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { recentUsers, activeUsers, inactiveUsers } = userStats || { recentUsers: [], activeUsers: 0, inactiveUsers: 0 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Atividade de Usuários
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Status Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
              <div className="text-sm text-green-700 dark:text-green-300">Usuários Ativos</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{inactiveUsers}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Usuários Inativos</div>
            </div>
          </div>

          {/* Recent Users List */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários Recentes
            </h4>
            <div className="space-y-3">
              {recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between space-x-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {user.full_name || user.email || 'Usuário sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : 'Data não disponível'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={user.subscription_status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.subscription_status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {user.admin_override_status && (
                        <Badge variant="outline" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
