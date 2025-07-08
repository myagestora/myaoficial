
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { MonthlyOverview } from '@/components/dashboard/MonthlyOverview';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();

  // Buscar estatísticas do usuário
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Buscar transações do usuário
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user.id);

      // Calcular totais
      const totalIncome = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const totalExpenses = transactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const balance = totalIncome - totalExpenses;

      // Buscar metas do usuário
      const { data: goals } = await supabase
        .from('goals')
        .select('current_amount, target_amount')
        .eq('user_id', user.id);

      // Calcular progresso das metas (média)
      let goalsProgress = 0;
      if (goals && goals.length > 0) {
        const totalProgress = goals.reduce((sum, goal) => {
          const progress = goal.target_amount > 0 
            ? (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100 
            : 0;
          return sum + Math.min(progress, 100);
        }, 0);
        goalsProgress = Math.round(totalProgress / goals.length);
      }

      return {
        totalIncome,
        totalExpenses,
        balance,
        goalsProgress
      };
    },
    enabled: !!user?.id
  });

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentStats = stats || {
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    goalsProgress: 0
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Bem-vindo ao seu controle financeiro</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <DollarSign className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {currentStats.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total de receitas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {currentStats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total de despesas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              currentStats.balance >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              R$ {currentStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Saldo atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{currentStats.goalsProgress}%</div>
            <p className="text-xs text-muted-foreground">Progresso das metas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyOverview />
        <ExpenseChart />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions />
    </div>
  );
};

export default Dashboard;
