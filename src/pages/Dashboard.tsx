
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
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
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

      return {
        totalIncome,
        totalExpenses,
        paidExpenses,
        pendingExpenses,
        balance
      };
    },
    enabled: !!user?.id
  });

  // Buscar progresso das metas considerando o período filtrado
  const { data: goalsProgress, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals-progress', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return 0;

      console.log('🎯 Buscando metas do usuário no período...');

      const { data: goals, error } = await supabase
        .from('goals')
        .select(`
          id,
          current_amount, 
          target_amount, 
          status, 
          goal_type,
          category_id,
          month_year,
          target_date,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) {
        console.error('❌ Erro ao buscar metas:', error);
        return 0;
      }

      if (!goals || goals.length === 0) {
        console.log('📝 Nenhuma meta ativa encontrada');
        return 0;
      }

      console.log('📊 Metas encontradas:', goals);

      // Filtrar metas relevantes para o período selecionado
      const relevantGoals = goals.filter(goal => {
        if (!dateRange?.from || !dateRange?.to) return true;

        if (goal.goal_type === 'monthly_budget' && goal.month_year) {
          const [goalYear, goalMonth] = goal.month_year.split('-').map(Number);
          const goalDate = new Date(goalYear, goalMonth - 1, 1);
          const fromMonth = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 1);
          const toMonth = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), 1);
          
          return goalDate >= fromMonth && goalDate <= toMonth;
        }

        if (goal.goal_type === 'savings' && goal.target_date) {
          const targetDate = new Date(goal.target_date);
          return targetDate >= dateRange.from && targetDate <= dateRange.to;
        }

        return true;
      });

      if (relevantGoals.length === 0) {
        console.log('📝 Nenhuma meta relevante para o período encontrada');
        return 0;
      }

      // Calcular progresso para cada meta
      const goalProgressPromises = relevantGoals.map(async (goal) => {
        if (goal.goal_type === 'monthly_budget' && goal.category_id && goal.month_year) {
          // Para metas de gastos mensais, buscar gastos reais do mês
          const [goalYear, goalMonth] = goal.month_year.split('-').map(Number);
          const startDate = new Date(goalYear, goalMonth - 1, 1);
          const endDate = new Date(goalYear, goalMonth, 1);

          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category_id', goal.category_id)
            .eq('type', 'expense')
            .gte('date', startDate.toISOString().split('T')[0])
            .lt('date', endDate.toISOString().split('T')[0]);

          const spentAmount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          const targetAmount = Number(goal.target_amount || 0);
          
          if (targetAmount === 0) return 0;
          
          // Para metas de gastos: calcular como "segurança" dentro da meta
          // Se gastou R$50 de uma meta de R$100, está 50% "seguro" (ainda pode gastar R$50)
          // Mas queremos mostrar como progresso positivo quando está dentro da meta
          const usagePercentage = (spentAmount / targetAmount) * 100;
          
          // Se gastou menos que a meta, o progresso é positivo
          // Se gastou igual ou mais que a meta, o progresso é baixo/negativo
          let progress;
          if (spentAmount <= targetAmount) {
            // Dentro da meta: progresso baseado no quanto "sobrou" da meta
            progress = Math.max(0, 100 - usagePercentage);
          } else {
            // Ultrapassou a meta: progresso muito baixo
            progress = 0;
          }
          
          console.log(`Meta mensal ${goal.categories?.name}: Gasto: ${spentAmount}, Orçamento: ${targetAmount}, Progresso: ${progress.toFixed(1)}%`);
          
          return Math.min(progress, 100);
        } else {
          // Para metas de economia, usar current_amount vs target_amount
          const currentAmount = Number(goal.current_amount || 0);
          const targetAmount = Number(goal.target_amount || 0);
          
          if (targetAmount === 0) return 0;
          
          const progress = (currentAmount / targetAmount) * 100;
          
          console.log(`Meta de economia: ${currentAmount}/${targetAmount} - Progresso: ${progress.toFixed(1)}%`);
          
          return Math.min(progress, 100);
        }
      });

      const goalProgresses = await Promise.all(goalProgressPromises);
      const totalProgress = goalProgresses.reduce((sum, progress) => sum + progress, 0);
      const averageProgress = Math.round(totalProgress / goalProgresses.length);
      
      console.log(`📈 Progresso médio das metas no período: ${averageProgress}%`);
      
      return averageProgress;
    },
    enabled: !!user?.id
  });

  if (statsLoading || goalsLoading) {
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
    balance: 0
  };

  const currentGoalsProgress = goalsProgress || 0;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground leading-tight">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Bem-vindo ao seu controle financeiro</p>
        </div>
        <div className="w-full md:w-auto">
          <PeriodFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium leading-tight">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-green-600 leading-tight">
              R$ {currentStats.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground leading-tight">Total de receitas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium leading-tight">Despesas Pagas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-red-600 leading-tight">
              R$ {currentStats.paidExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground leading-tight">Despesas realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium leading-tight">A Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-orange-600 leading-tight">
              R$ {currentStats.pendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground leading-tight">Despesas pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium leading-tight">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg md:text-2xl font-bold leading-tight ${
              currentStats.balance >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              R$ {currentStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground leading-tight">Saldo atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium leading-tight">Metas</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-purple-600 leading-tight">{currentGoalsProgress}%</div>
            <p className="text-xs text-muted-foreground leading-tight">Progresso das metas</p>
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
