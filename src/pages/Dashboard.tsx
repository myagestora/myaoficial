
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { MonthlyOverview } from '@/components/dashboard/MonthlyOverview';
import { DailyMovement } from '@/components/dashboard/DailyMovement';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DateRange } from 'react-day-picker';

const Dashboard = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Primeiro dia do mês atual
    to: new Date() // Data atual
  });

  // Buscar estatísticas do usuário
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return null;

      let transactionsQuery = supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', user.id);

      // Aplicar filtro de período se especificado
      if (dateRange?.from && dateRange?.to) {
        transactionsQuery = transactionsQuery
          .gte('date', dateRange.from.toISOString().split('T')[0])
          .lte('date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data: transactions } = await transactionsQuery;

      // Separar despesas pagas e a pagar
      const today = new Date().toISOString().split('T')[0];
      
      // Calcular totais
      const totalIncome = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const paidExpenses = transactions
        ?.filter(t => t.type === 'expense' && t.date <= today)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const pendingExpenses = transactions
        ?.filter(t => t.type === 'expense' && t.date > today)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const totalExpenses = paidExpenses + pendingExpenses;
      const balance = totalIncome - paidExpenses; // Saldo considerando apenas despesas pagas

      // Buscar metas do usuário (sem filtro de período)
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
        paidExpenses,
        pendingExpenses,
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
    paidExpenses: 0,
    pendingExpenses: 0,
    balance: 0,
    goalsProgress: 0
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Bem-vindo ao seu controle financeiro</p>
        </div>
        <PeriodFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
            <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {currentStats.paidExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Despesas realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {currentStats.pendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Despesas pendentes</p>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyOverview dateRange={dateRange} />
        <ExpenseChart dateRange={dateRange} />
      </div>

      {/* Daily Movement */}
      <DailyMovement dateRange={dateRange} />

      {/* Recent Transactions */}
      <RecentTransactions />
    </div>
  );
};

export default Dashboard;
