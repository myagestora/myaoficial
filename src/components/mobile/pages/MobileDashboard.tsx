import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Plus,
  Eye,
  EyeOff,
  CreditCard
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useGoals } from '@/hooks/useGoals';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { DateRange } from 'react-day-picker';
import { endOfMonth, startOfMonth } from 'date-fns';

export const MobileDashboard = () => {
  const [showValues, setShowValues] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { goals } = useGoals();

  // Buscar estatísticas do usuário baseado no período selecionado
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, dateRange],
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
      
      const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
      const balance = income - expenses;
      
      // Buscar transações recentes ordenadas pela data de criação (mais recentes primeiro)
      const recentTransactionsQuery = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateRange.from.toISOString().split('T')[0])
        .lte('date', dateRange.to.toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(5);
      
      return { 
        income, 
        expenses, 
        balance, 
        recentTransactions: recentTransactionsQuery.data || [] 
      };
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

  return (
    <MobilePageWrapper>
      {/* Filtro de Período */}
      <div className="mb-4">
        <PeriodFilter 
          dateRange={dateRange} 
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Header com saldo */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Saldo Total</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowValues(!showValues)}
            >
              {showValues ? <Eye size={14} /> : <EyeOff size={14} />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-primary">
            {isLoading ? '...' : formatCurrency(stats?.balance || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Saldo do período selecionado
          </p>
        </CardContent>
      </Card>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          className="h-16 flex-col space-y-1"
          onClick={() => navigate('/transactions')}
        >
          <Plus size={20} />
          <span className="text-xs">Nova Transação</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex-col space-y-1"
          onClick={() => navigate('/reports')}
        >
          <CreditCard size={20} />
          <span className="text-xs">Ver Relatórios</span>
        </Button>
      </div>

      {/* Resumo mensal */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold text-green-600">
              {isLoading ? '...' : formatCurrency(stats?.income || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold text-red-600">
              {isLoading ? '...' : formatCurrency(stats?.expenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Período selecionado</p>
          </CardContent>
        </Card>
      </div>

      {/* Metas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Metas do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {goals && goals.length > 0 ? (
            <>
              {goals.slice(0, 2).map((goal) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{goal.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(((goal.current_amount || 0) / goal.target_amount) * 100)}% de {formatCurrency(goal.target_amount)}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate('/goals')}
              >
                Ver todas as metas
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma meta definida</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/goals')}
              >
                Criar primeira meta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transações recentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
            <>
              {stats.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      <DollarSign size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{transaction.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => navigate('/transactions')}
              >
                Ver todas as transações
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
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