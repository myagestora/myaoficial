import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Plus,
  Eye,
  EyeOff,
  CreditCard,
  Calendar,
  BarChart3,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  MessageCircle,
  Phone,
  Home,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useGoals } from '@/hooks/useGoals';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { DateRange } from 'react-day-picker';
import { endOfMonth, startOfMonth, format } from 'date-fns';
import { getCurrentDateForInput, getBrazilianDate, formatDateBrazilian } from '@/utils/timezoneUtils';
import { ptBR } from 'date-fns/locale';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useTransactions } from '@/hooks/useTransactions';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { MonthlyOverview } from '@/components/dashboard/MonthlyOverview';
import { DailyMovement } from '@/components/dashboard/DailyMovement';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { Progress } from '@/components/ui/progress';

export const MobileDashboard = () => {
  const [showValues, setShowValues] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(getBrazilianDate()),
    to: endOfMonth(getBrazilianDate())
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { goals } = useGoals();
  const { bankAccounts, isLoading: loadingAccounts } = useBankAccounts();
  const { creditCards, isLoading: loadingCards } = useCreditCards();
  const { transactions, isLoading: loadingTransactions } = useTransactions();

  // Buscar perfil do usuário para obter nome
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Buscar WhatsApp de suporte das configurações do sistema
  const { data: supportWhatsapp } = useQuery({
    queryKey: ['support-whatsapp'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'support_phone')
        .maybeSingle();
      
      if (error) {
        console.log('Erro ao buscar WhatsApp de suporte:', error);
        return null;
      }
      
      const numberValue = data?.value;
      if (typeof numberValue === 'string') {
        return numberValue.replace(/^"|"$/g, '').replace(/\+/, '');
      }
      return numberValue ? JSON.stringify(numberValue).replace(/^"|"$/g, '').replace(/\+/, '') : null;
    }
  });

  // Buscar estatísticas detalhadas do usuário baseado no período selecionado
  const { data: stats, isLoading } = useQuery({
    queryKey: ['mobile-dashboard-stats', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id || !dateRange?.from || !dateRange?.to) return null;
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateRange.from.toISOString().split('T')[0])
        .lte('date', dateRange.to.toISOString().split('T')[0]);

      const { data: transactions, error } = await query;
      
      if (error) throw error;

      // Separar por tipo e status (pagas vs pendentes)
      const today = getCurrentDateForInput();
      
      const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const paidExpenses = transactions?.filter(t => t.type === 'expense' && t.date <= today).reduce((sum, t) => sum + t.amount, 0) || 0;
      const pendingExpenses = transactions?.filter(t => t.type === 'expense' && t.date > today).reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpenses = paidExpenses + pendingExpenses;
      const balance = income - paidExpenses;
      
      // Buscar transações recentes
      const recentQuery = await supabase
        .from('transactions')
        .select(`
          *,
          categories (name, color)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      return { 
        income, 
        paidExpenses,
        pendingExpenses,
        totalExpenses,
        balance, 
        recentTransactions: recentQuery.data || [] 
      };
    },
    enabled: !!user?.id && !!dateRange?.from && !!dateRange?.to
  });

  // Calcular progresso das metas igual ao desktop
  const { data: goalsProgress, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals-progress-mobile', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return 0;
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
      if (error || !goals || goals.length === 0) return 0;
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
      if (relevantGoals.length === 0) return 0;
      // Calcular progresso para cada meta
      const goalProgressPromises = relevantGoals.map(async (goal) => {
        if (goal.goal_type === 'monthly_budget' && goal.category_id && goal.month_year) {
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
          const usagePercentage = (spentAmount / targetAmount) * 100;
          let progress;
          if (spentAmount <= targetAmount) {
            progress = Math.max(0, 100 - usagePercentage);
          } else {
            progress = 0;
          }
          return Math.min(progress, 100);
        } else {
          const currentAmount = Number(goal.current_amount || 0);
          const targetAmount = Number(goal.target_amount || 0);
          if (targetAmount === 0) return 0;
          const progress = (currentAmount / targetAmount) * 100;
          return Math.min(progress, 100);
        }
      });
      const goalProgresses = await Promise.all(goalProgressPromises);
      const totalProgress = goalProgresses.reduce((sum, progress) => sum + progress, 0);
      const averageProgress = Math.round(totalProgress / goalProgresses.length);
      return averageProgress;
    },
    enabled: !!user?.id && !!dateRange?.from && !!dateRange?.to
  });

  // Buscar metas do mês detalhadas
  const { data: metasMes, isLoading: metasLoading } = useQuery({
    queryKey: ['goals-list-mobile', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: goals, error } = await supabase
        .from('goals')
        .select(`
          id,
          title,
          current_amount,
          target_amount,
          status,
          goal_type,
          category_id,
          month_year,
          target_date,
          categories (name, color)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (error || !goals || goals.length === 0) return [];
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
      if (relevantGoals.length === 0) return [];
      // Calcular progresso para cada meta
      const goalProgressPromises = relevantGoals.map(async (goal) => {
        let progress = 0;
        if (goal.goal_type === 'monthly_budget' && goal.category_id && goal.month_year) {
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
          if (targetAmount > 0) {
            const usagePercentage = (spentAmount / targetAmount) * 100;
            progress = spentAmount <= targetAmount ? Math.max(0, 100 - usagePercentage) : 0;
          }
          return {
            ...goal,
            progress: Math.round(progress),
            current_amount: spentAmount,
          };
        } else {
          const currentAmount = Number(goal.current_amount || 0);
          const targetAmount = Number(goal.target_amount || 0);
          if (targetAmount > 0) {
            progress = (currentAmount / targetAmount) * 100;
          }
          return {
            ...goal,
            progress: Math.round(Math.min(progress, 100)),
            current_amount: currentAmount,
          };
        }
      });
      return Promise.all(goalProgressPromises);
    },
    enabled: !!user?.id && !!dateRange?.from && !!dateRange?.to
  });

  const formatCurrency = (value: number) => {
    if (!showValues) return '****';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (!showValues) return '****';
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value);
  };

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

  return (
    <div className="bg-[#F6F8FA] min-h-screen p-2 space-y-3">
      {/* Header de boas-vindas */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Home className="w-5 h-5 text-blue-700" />
                </div>
                <div>
          <h1 className="text-base font-semibold text-gray-900">Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}!</h1>
          <p className="text-[11px] text-gray-400">Resumo financeiro do mês</p>
                </div>
              </div>

      {/* Cards de resumo estilo desktop: 3 por linha, 2 linhas */}
      <div className="grid grid-cols-3 gap-2 mb-1">
        {/* Receitas */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col items-start min-w-0">
          <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
          <span className="text-[11px] text-gray-400">Receitas</span>
          <span className="text-base font-semibold text-green-700 leading-tight">{isLoading ? '...' : formatCurrency(stats?.income || 0)}</span>
            </div>
        {/* Despesas Pagas */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col items-start min-w-0">
          <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <span className="text-[11px] text-gray-400">Despesas Pagas</span>
          <span className="text-base font-semibold text-red-700 leading-tight">{isLoading ? '...' : formatCurrency(stats?.paidExpenses || 0)}</span>
        </div>
        {/* Despesas a Pagar */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col items-start min-w-0">
          <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
      </div>
          <span className="text-[11px] text-gray-400">A Pagar</span>
          <span className="text-base font-semibold text-orange-600 leading-tight">{isLoading ? '...' : formatCurrency(stats?.pendingExpenses || 0)}</span>
              </div>
        {/* Saldo */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col items-start min-w-0">
          <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center mb-1">
            <Wallet className="w-4 h-4 text-blue-600" />
              </div>
          <span className="text-[11px] text-gray-400">Saldo</span>
          <span className="text-base font-semibold text-blue-700 leading-tight">{isLoading ? '...' : formatCurrency(stats?.balance || 0)}</span>
            </div>
        {/* Saldo Previsto */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col items-start min-w-0">
          <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center mb-1">
            <ArrowUpRight className="w-4 h-4 text-gray-500" />
          </div>
          <span className="text-[11px] text-gray-400">Saldo Previsto</span>
          <span className="text-base font-semibold text-gray-700 leading-tight">{isLoading ? '...' : formatCurrency((stats?.balance || 0) - (stats?.pendingExpenses || 0))}</span>
        </div>
        {/* Metas */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 flex flex-col items-start min-w-0">
          <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center mb-1">
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-[11px] text-gray-400">Metas</span>
          <span className="text-base font-semibold text-purple-700 leading-tight">{goalsLoading ? '...' : goalsProgress ?? 0}%</span>
        </div>
      </div>

      {/* Seção Meus Cartões */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-sm text-gray-900">Meus cartões</span>
          </div>
          <button className="text-xs text-purple-600 font-semibold hover:underline" onClick={() => navigate('/cards')}>Ver todos</button>
        </div>
        {/* Cartões reais */}
        {loadingCards || loadingTransactions ? (
          <div className="text-center text-xs text-gray-400">Carregando cartões...</div>
        ) : creditCards.length === 0 ? (
          <div className="text-center text-xs text-gray-400">Nenhum cartão cadastrado</div>
        ) : creditCards.map((card) => {
          const saldoAtual = getCardBalance(card.id, card.current_balance);
          const utilizacao = card.credit_limit ? (saldoAtual / card.credit_limit) * 100 : 0;
          return (
            <div key={card.id} className="flex items-center gap-2 mt-1 min-h-[38px]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: card.color }}>
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm text-gray-900 truncate">{card.name}</span>
                  {card.due_date && <span className="text-[10px] text-gray-400">{card.due_date.toString().padStart(2, '0')}</span>}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-green-700 font-semibold text-[15px]">{formatCurrency(saldoAtual)}</span>
                  {card.credit_limit && <span className="text-[11px] text-gray-400">/ {formatCurrency(card.credit_limit)}</span>}
                </div>
                {card.credit_limit && (
                  <div className="w-full bg-gray-200 rounded h-1 mt-1">
                    <div className="bg-green-500 h-1 rounded" style={{ width: `${utilizacao}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção Minhas Contas */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <PiggyBank className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-sm text-gray-900">Minhas contas</span>
          </div>
          <button className="text-xs text-blue-600 font-semibold hover:underline" onClick={() => navigate('/accounts')}>Ver todas</button>
        </div>
        {/* Contas reais */}
        {loadingAccounts || loadingTransactions ? (
          <div className="text-center text-xs text-gray-400">Carregando contas...</div>
        ) : bankAccounts.length === 0 ? (
          <div className="text-center text-xs text-gray-400">Nenhuma conta cadastrada</div>
        ) : bankAccounts.map((account) => (
          <div key={account.id} className="flex items-center gap-2 mt-1 min-h-[38px]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: account.color }}>
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm text-gray-900 truncate">{account.name}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-blue-700 font-semibold text-[15px]">{formatCurrency(getAccountBalance(account.id, account.balance))}</span>
              </div>
            </div>
          </div>
        ))}
            </div>

      {/* Seção Gráficos e Transações Recentes */}
      <div className="space-y-3 mt-3">
        {/* Gráfico: Despesas por Categoria */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-0">
          <div className="flex items-center gap-1 mb-0 p-4 pb-0">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-sm text-gray-900">Despesas por Categoria</span>
          </div>
          <div className="p-4 pt-2">
            <ExpenseChart dateRange={dateRange} hideTitle />
          </div>
        </div>
        {/* Gráfico: Evolução do Saldo */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-0">
          <div className="flex items-center gap-1 mb-0 p-4 pb-0">
            <ArrowUpRight className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-sm text-gray-900">Evolução do Saldo</span>
          </div>
          <div className="p-4 pt-2">
            <MonthlyOverview dateRange={dateRange} hideTitle />
          </div>
        </div>
        {/* Gráfico: Movimentação Diária */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-0">
          <div className="flex items-center gap-1 mb-0 p-4 pb-0">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            <span className="font-semibold text-sm text-gray-900">Movimentação Diária</span>
              </div>
          <div className="p-4 pt-2">
            <DailyMovement dateRange={dateRange} hideTitle />
              </div>
            </div>
        {/* Card Metas do Mês */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <PiggyBank className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-sm text-gray-900">Metas do Mês</span>
            </div>
            <button className="text-xs text-purple-600 font-semibold hover:underline" onClick={() => navigate('/goals')}>Ver todas</button>
          </div>
          {/* Listar metas do mês */}
          {(metasLoading ? [] : metasMes || []).slice(0, 2).map((goal: any, idx: number) => (
            <div key={goal?.id || idx} className="mb-3 last:mb-0 bg-purple-50/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs text-gray-900 truncate">{goal?.title || 'Meta'}</span>
                <span className="text-xs text-purple-700 font-semibold">{goal?.progress || 0}%</span>
              </div>
              <Progress value={goal?.progress || 0} className="h-1 bg-purple-200" />
              <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                <span>R$ {goal?.current_amount?.toLocaleString('pt-BR') || '0,00'}</span>
                <span>R$ {goal?.target_amount?.toLocaleString('pt-BR') || '0,00'}</span>
              </div>
            </div>
          ))}
      </div>

        {/* Transações Recentes - visual moderno */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-sm text-gray-900">Transações Recentes</span>
            </div>
            <button className="text-xs text-blue-600 font-semibold hover:underline" onClick={() => navigate('/transactions')}>Ver Todas</button>
                </div>
                <div className="space-y-2">
            {(stats?.recentTransactions || []).map((transaction: any, idx: number) => {
              const isIncome = transaction.type === 'income';
              const iconBg = isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
              const icon = isIncome ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />;
              const valueColor = isIncome ? 'text-green-700' : 'text-red-700';
              let badgeName = '';
              if (transaction.account_id && transaction.account_name) badgeName = transaction.account_name;
              if (transaction.card_id && transaction.card_name) badgeName = transaction.card_name;
              return (
                <div key={transaction.id || idx} className="rounded-xl border border-gray-100 shadow-sm p-2 flex flex-col gap-1 relative bg-white">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${iconBg}`}>{icon}</div>
                    <span className="font-semibold text-sm text-gray-900 truncate flex-1">{transaction.title}</span>
                    {transaction.categories?.name && <span className="text-[11px] text-gray-500 ml-2">{transaction.categories.name}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className={`font-bold ${valueColor} text-base`}>{isIncome ? '+' : '-'}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-[11px] text-gray-400">{transaction.date ? new Date(transaction.date).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                  {badgeName && (
                    <div className="flex items-center justify-end mt-1">
                      <span className="text-[11px] text-gray-500 italic">{badgeName}</span>
                    </div>
                  )}
                </div>
              );
            })}
                </div>
              </div>
              </div>

      {/* Menu inferior compacto */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 flex items-center justify-around h-12 shadow-sm">
        <button className="flex flex-col items-center justify-center text-blue-600">
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Início</span>
        </button>
        <button className="flex flex-col items-center justify-center text-gray-400">
          <CreditCard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Transações</span>
        </button>
        <button className="flex flex-col items-center justify-center text-gray-400">
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Relatórios</span>
        </button>
        <button className="flex flex-col items-center justify-center text-gray-400">
          <Target className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Metas</span>
        </button>
      </nav>
            </div>
  );
};