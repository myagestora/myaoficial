
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, DollarSign, TrendingUp, Calendar, UserCheck, UserX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { AdminMonthlyOverview } from '@/components/admin/AdminMonthlyOverview';
import { AdminRevenueChart } from '@/components/admin/AdminRevenueChart';
import { AdminUserActivity } from '@/components/admin/AdminUserActivity';
import { DateRange } from 'react-day-picker';

const AdminDashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Primeiro dia do mês atual
    to: new Date() // Data atual
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', dateRange],
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

      // Buscar assinaturas canceladas
      const { count: canceledSubscriptions, error: canceledError } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'canceled');
      
      if (canceledError) {
        console.error('❌ Erro ao buscar assinaturas canceladas:', canceledError);
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

      // Buscar usuários com filtro de período
      let filteredUsersQuery = supabase
        .from('profiles')
        .select('subscription_status', { count: 'exact', head: true });

      if (dateRange?.from && dateRange?.to) {
        filteredUsersQuery = filteredUsersQuery
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { count: periodUsers } = await filteredUsersQuery;

      console.log('📊 Estatísticas calculadas:', {
        totalUsers,
        activeSubscriptions,
        canceledSubscriptions,
        monthlyRevenue,
        growthRate: growthRate.toFixed(1),
        periodUsers
      });

      return {
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        canceledSubscriptions: canceledSubscriptions || 0,
        monthlyRevenue: monthlyRevenue,
        growthRate: Number(growthRate.toFixed(1)),
        periodUsers: periodUsers || 0
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
          <p className="text-gray-600 dark:text-gray-400">Visão geral do sistema MYA Gestora</p>
        </div>
        <PeriodFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">Usuários pagantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Canceladas</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.canceledSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">Cancelamentos</p>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminMonthlyOverview dateRange={dateRange} />
        <AdminRevenueChart dateRange={dateRange} />
      </div>

      {/* User Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminUserActivity dateRange={dateRange} />
        
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
              <button 
                onClick={() => window.location.href = '/admin/reports'}
                className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <TrendingUp className="h-6 w-6 text-purple-600 mb-2" />
                <p className="text-sm font-medium">Relatórios</p>
              </button>
              <button 
                onClick={() => window.location.href = '/admin/settings'}
                className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                <Calendar className="h-6 w-6 text-orange-600 mb-2" />
                <p className="text-sm font-medium">Configurações</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users Summary */}
      {recentUsers && recentUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimos Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.full_name || user.email || 'Usuário sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : 'Data não disponível'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
