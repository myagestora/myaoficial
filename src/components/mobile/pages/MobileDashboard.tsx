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
  Phone
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

export const MobileDashboard = () => {
  const [showValues, setShowValues] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(getBrazilianDate()),
    to: endOfMonth(getBrazilianDate())
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { goals } = useGoals();

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

  // Calcular progresso das metas
  const goalsProgress = goals && goals.length > 0 
    ? Math.round(goals.reduce((sum, goal) => {
        const progress = goal.target_amount > 0 
          ? ((goal.current_amount || 0) / goal.target_amount) * 100 
          : 0;
        return sum + Math.min(progress, 100);
      }, 0) / goals.length)
    : 0;

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

  return (
    <MobilePageWrapper className="bg-gradient-to-br from-background to-primary/5">
      {/* WhatsApp Suporte Info Card */}
      {supportWhatsapp && (
        <Card className="mb-4 bg-gradient-to-r from-green-500/10 to-green-600/5 border-green-500/20 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-full">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">WhatsApp</p>
                  <p className="text-xs text-green-600 dark:text-green-300">Para falar com nossa IA Mya</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => window.open(`https://wa.me/55${supportWhatsapp}`, '_blank')}
              >
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <Badge variant="outline" className="border-green-500/30 text-green-700 dark:text-green-300">
                    {supportWhatsapp}
                  </Badge>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header com período */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}! 👋
              {dateRange?.from && dateRange?.to && (
                <span className="block mt-1">
                  {format(dateRange.from, 'dd MMM', { locale: ptBR }) + ' - ' + 
                   format(dateRange.to, 'dd MMM yyyy', { locale: ptBR })}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowValues(!showValues)}
            className="shrink-0"
          >
            {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
          </Button>
        </div>
        
        <PeriodFilter 
          dateRange={dateRange} 
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Saldo Principal */}
      <Card className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white border-0 shadow-xl mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-3 rounded-full">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Saldo Atual</p>
                <p className="text-white/60 text-xs">Receitas - Despesas Pagas</p>
              </div>
            </div>
            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
              (stats?.balance || 0) >= 0 
                ? 'bg-green-500/20 text-green-100' 
                : 'bg-red-500/20 text-red-100'
            }`}>
              {(stats?.balance || 0) >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              <span>{(stats?.balance || 0) >= 0 ? 'Positivo' : 'Negativo'}</span>
            </div>
          </div>
          <div className="text-3xl font-bold">
            {isLoading ? '...' : formatCurrency(stats?.balance || 0)}
          </div>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button 
          className="h-20 flex-col space-y-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0 shadow-lg"
          onClick={() => navigate('/transactions')}
        >
          <Plus size={24} />
          <span className="text-sm font-medium">Nova Transação</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-20 flex-col space-y-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:bg-gradient-to-br hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-800"
          onClick={() => navigate('/reports')}
        >
          <BarChart3 size={24} />
          <span className="text-sm font-medium">Relatórios</span>
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Receitas</p>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  {isLoading ? '...' : formatShortCurrency(stats?.income || 0)}
                </p>
              </div>
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400">
              Total do período
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-red-500 p-2 rounded-lg">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">Despesas</p>
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  {isLoading ? '...' : formatShortCurrency(stats?.paidExpenses || 0)}
                </p>
              </div>
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">
              Já pagas
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">A Pagar</p>
                <p className="text-sm font-bold text-orange-800 dark:text-orange-200">
                  {isLoading ? '...' : formatShortCurrency(stats?.pendingExpenses || 0)}
                </p>
              </div>
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400">
              Pendentes
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-500 p-2 rounded-lg">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Metas</p>
                <p className="text-sm font-bold text-purple-800 dark:text-purple-200">
                  {goalsProgress}%
                </p>
              </div>
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              Progresso médio
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metas em Destaque */}
      {goals && goals.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center">
                <PiggyBank className="h-5 w-5 mr-2 text-purple-600" />
                Metas do Mês
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/goals')}
                className="text-xs"
              >
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.slice(0, 2).map((goal) => (
              <div key={goal.id} className="space-y-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg border border-purple-100 dark:border-purple-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{goal.title}</span>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                    {Math.round(((goal.current_amount || 0) / goal.target_amount) * 100)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatShortCurrency(goal.current_amount || 0)}</span>
                    <span>{formatShortCurrency(goal.target_amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Transações Recentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
              Recentes
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/transactions')}
              className="text-xs"
            >
              Ver todas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
            stats.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'income' 
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' 
                      : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                  }`}>
                    {transaction.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{transaction.title}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDateBrazilian(transaction.date, 'dd MMM')}
                      </p>
                      {transaction.categories && (
                        <div className="flex items-center">
                          <div 
                            className="w-2 h-2 rounded-full mr-1" 
                            style={{ backgroundColor: transaction.categories.color }}
                          />
                          <span className="text-xs text-muted-foreground">{transaction.categories.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatShortCurrency(transaction.amount)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">Nenhuma transação encontrada</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/transactions')}
              >
                Adicionar primeira transação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </MobilePageWrapper>
  );
};