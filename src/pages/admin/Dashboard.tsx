
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      console.log('🔄 Buscando estatísticas do admin...');
      
      // Buscar total de usuários
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (usersError) {
        console.error('❌ Erro ao buscar usuários:', usersError);
      }

      // Buscar assinaturas ativas
      const { count: activeSubscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (subscriptionsError) {
        console.error('❌ Erro ao buscar assinaturas:', subscriptionsError);
      }

      // Buscar planos para calcular receita
      const { data: subscriptionsWithPlans, error: revenueError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            price_monthly
          )
        `)
        .eq('status', 'active');
      
      if (revenueError) {
        console.error('❌ Erro ao buscar dados de receita:', revenueError);
      }

      // Calcular receita mensal
      const monthlyRevenue = subscriptionsWithPlans?.reduce((total, sub) => {
        const plan = sub.subscription_plans as any;
        return total + (plan?.price_monthly || 0);
      }, 0) || 0;

      // Buscar usuários dos últimos 30 dias para calcular crescimento
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: newUsers, error: newUsersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      if (newUsersError) {
        console.error('❌ Erro ao buscar novos usuários:', newUsersError);
      }

      // Calcular taxa de crescimento (simplificado)
      const growthRate = totalUsers ? ((newUsers || 0) / totalUsers * 100) : 0;

      console.log('📊 Estatísticas calculadas:', {
        totalUsers,
        activeSubscriptions,
        monthlyRevenue,
        growthRate: growthRate.toFixed(1)
      });

      return {
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        monthlyRevenue: monthlyRevenue,
        growthRate: Number(growthRate.toFixed(1))
      };
    }
  });

  const { data: recentUsers } = useQuery({
    queryKey: ['recent-users'],
    queryFn: async () => {
      console.log('👥 Buscando usuários recentes...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('❌ Erro ao buscar usuários recentes:', error);
        return [];
      }
      
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
        <p className="text-gray-600 dark:text-gray-400">Visão geral do sistema MYA Gestora</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Usuários registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">Usuários pagantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats?.monthlyRevenue ? stats.monthlyRevenue.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) : '0,00'}
            </div>
            <p className="text-xs text-muted-foreground">Receita recorrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Crescimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.growthRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => window.location.href = '/admin/users'}
                className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Users className="h-6 w-6 text-blue-600 mb-2" />
                <p className="text-sm font-medium">Gerenciar Usuários</p>
              </button>
              <button 
                onClick={() => window.location.href = '/admin/subscriptions'}
                className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <CreditCard className="h-6 w-6 text-green-600 mb-2" />
                <p className="text-sm font-medium">Planos e Preços</p>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers && recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || user.email || 'Usuário sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registrado {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : 'Data não disponível'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
