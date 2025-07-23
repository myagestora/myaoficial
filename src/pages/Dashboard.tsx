
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
import { getCurrentDateForInput } from '@/utils/timezoneUtils';
import { ModernCard } from '@/components/ui/card';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { CreditCard, Wallet } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';

const Dashboard = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
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
      const today = getCurrentDateForInput();
      
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

  const { bankAccounts, isLoading: loadingAccounts } = useBankAccounts();
  const { creditCards, isLoading: loadingCards } = useCreditCards();
  const { transactions, isLoading: loadingTransactions } = useTransactions();

  // Função para saldo real da conta
  const getAccountBalance = (accountId, initialBalance) => {
    if (!transactions) return initialBalance;
    let saldo = initialBalance;
    transactions.forEach((t) => {
      if ((t as any).account_id === accountId) {
        if (t.type === 'income') saldo += t.amount;
        if (t.type === 'expense') saldo -= t.amount;
      }
    });
    return saldo;
  };

  // Função para saldo real do cartão
  const getCardBalance = (cardId, initialBalance) => {
    if (!transactions) return initialBalance;
    let saldo = 0;
    transactions.forEach((t) => {
      if ((t as any).card_id === cardId && t.type === 'expense') {
        saldo += t.amount;
      }
    });
    return saldo;
  };

  // Função para exibir tipo de conta em português
  const getAccountTypeLabel = (type) => {
    const types = {
      checking: 'Conta Corrente',
      savings: 'Poupança',
      investment: 'Investimento',
    };
    return types[type] || type;
  };

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

  // Novo: saldo previsto = receitas - (despesas pagas + a pagar)
  const predictedBalance = currentStats.totalIncome - currentStats.totalExpenses;

  // Padronizar tamanho e alinhamento dos ícones dos cards
  const cardIconClass = "h-6 w-6 mx-auto my-0";
  // Padronizar tamanho do círculo e do ícone
  const cardIconWrapperClass = "flex items-center justify-center rounded-full mx-auto my-0";
  const cardIconStyle = { width: '1em', height: '1em' };
  const cardIconBgSize = { width: 30, height: 30, minWidth: 30, minHeight: 30 };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header padrão */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-2">Dashboard</h1>
        <p className="text-base md:text-lg text-muted-foreground">Bem-vindo ao seu controle financeiro</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 xl:gap-4">
        {/* Receitas */}
        <ModernCard
          icon={
            <span className={cardIconWrapperClass} style={{ ...cardIconBgSize, background: '#DCFCE7' }}>
              <TrendingUp style={cardIconStyle} className="text-green-600" />
            </span>
          }
          title={<span className="block text-base font-semibold truncate" style={{ minHeight: 24 }}>Receitas</span>}
          value={`R$ ${currentStats.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          valueColor="text-green-600"
          description={<span className="block text-xs truncate" style={{ minHeight: 18 }}>Total de receitas</span>}
        />
        {/* Despesas Pagas */}
        <ModernCard
          icon={
            <span className={cardIconWrapperClass} style={{ ...cardIconBgSize, background: '#FEE2E2' }}>
              <TrendingDown style={cardIconStyle} className="text-red-600" />
            </span>
          }
          title={<span className="block text-base font-semibold truncate" style={{ minHeight: 24 }}>Despesas Pagas</span>}
          value={`R$ ${currentStats.paidExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          valueColor="text-red-600"
          description={<span className="block text-xs truncate" style={{ minHeight: 18 }}>Despesas realizadas</span>}
        />
        {/* A Pagar */}
        <ModernCard
          icon={
            <span className={cardIconWrapperClass} style={{ ...cardIconBgSize, background: '#FFEDD5' }}>
              <TrendingDown style={cardIconStyle} className="text-orange-600" />
            </span>
          }
          title={<span className="block text-base font-semibold truncate" style={{ minHeight: 24 }}>A Pagar</span>}
          value={`R$ ${currentStats.pendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          valueColor="text-orange-600"
          description={<span className="block text-xs truncate" style={{ minHeight: 18 }}>Despesas pendentes</span>}
        />
        {/* Saldo Atual */}
        <ModernCard
          icon={
            <span className={cardIconWrapperClass} style={{ ...cardIconBgSize, background: '#DBEAFE' }}>
              <DollarSign style={cardIconStyle} className="text-blue-600" />
            </span>
          }
          title={<span className="block text-base font-semibold truncate" style={{ minHeight: 24 }}>Saldo</span>}
          value={`R$ ${currentStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          valueColor={currentStats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}
          description={<span className="block text-xs truncate" style={{ minHeight: 18 }}>Saldo atual</span>}
        />
        {/* Saldo Previsto */}
        <ModernCard
          icon={
            <span className={cardIconWrapperClass} style={{ ...cardIconBgSize, background: '#CFFAFE' }}>
              <DollarSign style={cardIconStyle} className="text-cyan-600" />
            </span>
          }
          title={<span className="block text-base font-semibold truncate" style={{ minHeight: 24 }}>Saldo Previsto</span>}
          value={`R$ ${predictedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          valueColor={predictedBalance >= 0 ? 'text-cyan-600' : 'text-red-600'}
          description={<span className="block text-xs truncate" style={{ minHeight: 18 }}>Após despesas pagas</span>}
        />
        {/* Metas */}
        <ModernCard
          icon={
            <span className={cardIconWrapperClass} style={{ ...cardIconBgSize, background: '#EDE9FE' }}>
              <Target style={cardIconStyle} className="text-purple-600" />
            </span>
          }
          title={<span className="block text-base font-semibold truncate" style={{ minHeight: 24 }}>Metas</span>}
          value={`${currentGoalsProgress}%`}
          valueColor="text-purple-600"
          description={<span className="block text-xs truncate" style={{ minHeight: 18 }}>Progresso das metas</span>}
        />
      </div>

      {/* Seção Cartões */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-600" /> Cartões</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingCards || loadingTransactions ? (
            <div>Carregando cartões...</div>
          ) : creditCards.length === 0 ? (
            <div>Nenhum cartão cadastrado</div>
          ) : creditCards.map((card) => {
            const saldoAtual = getCardBalance(card.id, card.current_balance);
            const utilizacao = card.credit_limit ? (saldoAtual / card.credit_limit) * 100 : 0;
            return (
              <div key={card.id} className="bg-white rounded-2xl shadow p-4 flex items-center gap-4 relative border border-gray-100">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: card.color }}>
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-base text-gray-900 truncate">{card.name}</span>
                    {card.is_default && <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5 ml-2">Padrão</span>}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Limite</span>
                    <span className="font-bold text-purple-700">{card.credit_limit?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Utilização</span>
                    <span className="text-xs text-gray-700">{utilizacao.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${utilizacao}%` }} />
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Saldo Atual</span>
                    <span className="font-bold text-blue-700">{saldoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  {card.last_four_digits && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Final</span>
                      <span className="text-xs text-gray-700">**** {card.last_four_digits}</span>
                    </div>
                  )}
                  {card.due_date && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Vencimento</span>
                      <span className="text-xs text-gray-700">Dia {card.due_date}</span>
                    </div>
                  )}
                </div>
        </div>
            );
          })}
        </div>
      </div>

      {/* Seção Contas */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" /> Contas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingAccounts || loadingTransactions ? (
            <div>Carregando contas...</div>
          ) : bankAccounts.length === 0 ? (
            <div>Nenhuma conta cadastrada</div>
          ) : bankAccounts.map((account) => (
            <div key={account.id} className="bg-white rounded-2xl shadow p-4 flex items-center gap-4 relative border border-gray-100">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: account.color }}>
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base text-gray-900 truncate">{account.name}</span>
                  {account.is_default && <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5 ml-2">Padrão</span>}
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Tipo</span>
                  <span className="text-xs">{getAccountTypeLabel(account.type)}</span>
                </div>
                {account.bank_name && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Banco</span>
                    <span className="text-xs text-gray-700">{account.bank_name}</span>
                  </div>
                )}
                {account.account_number && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Número</span>
                    <span className="text-xs text-gray-700">{account.account_number}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Saldo</span>
                  <span className="font-bold text-blue-700">{getAccountBalance(account.id, account.balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            </div>
            </div>
          ))}
            </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard className="h-full">
        <MonthlyOverview dateRange={dateRange} />
        </ModernCard>
        <ModernCard className="h-full">
        <ExpenseChart dateRange={dateRange} />
        </ModernCard>
      </div>

      {/* Daily Movement */}
      <ModernCard className="mt-6">
      <DailyMovement dateRange={dateRange} />
      </ModernCard>

      {/* Recent Transactions */}
      <ModernCard className="mt-6">
      <RecentTransactions dateRange={dateRange} />
      </ModernCard>
    </div>
  );
};

export default Dashboard;
