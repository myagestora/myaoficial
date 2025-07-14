
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useScheduledTransactions } from '@/hooks/useScheduledTransactions';
import { startOfDay, isBefore } from 'date-fns';

interface ScheduledStatsProps {
  totalScheduled: number;
  upcomingExecutions: number;
  overdueScheduled: number;
}

export const ScheduledStats = ({ 
  totalScheduled, 
  upcomingExecutions, 
  overdueScheduled 
}: ScheduledStatsProps) => {
  const { scheduledTransactions } = useScheduledTransactions();

  // Calculate overdue transactions (transações que passaram da data, excluindo hoje)
  const overdueCount = useMemo(() => {
    const today = startOfDay(new Date());
    return scheduledTransactions?.filter(t => {
      const transactionDate = startOfDay(new Date(t.date));
      return isBefore(transactionDate, today); // Só antes de hoje, não inclui hoje
    }).length || 0;
  }, [scheduledTransactions]);

  // Calculate today's transactions
  const todayCount = useMemo(() => {
    const today = startOfDay(new Date());
    return scheduledTransactions?.filter(t => {
      const transactionDate = startOfDay(new Date(t.date));
      return transactionDate.getTime() === today.getTime();
    }).length || 0;
  }, [scheduledTransactions]);

  // Calculate monthly impact
  const monthlyImpact = useMemo(() => {
    const monthlyIncome = scheduledTransactions?.filter(t => t.type === 'income' && t.is_recurring)
      .reduce((sum, t) => {
        let monthlyAmount = t.amount;
        switch (t.recurrence_frequency) {
          case 'daily': monthlyAmount = t.amount * 30; break;
          case 'weekly': monthlyAmount = t.amount * 4; break;
          case 'biweekly': monthlyAmount = t.amount * 2; break;
          case 'quarterly': monthlyAmount = t.amount / 3; break;
          case 'semiannual': monthlyAmount = t.amount / 6; break;
          case 'yearly': monthlyAmount = t.amount / 12; break;
          case 'custom': monthlyAmount = t.amount * (30 / ((t.recurrence_interval || 1) * 1)); break;
          default: monthlyAmount = t.amount; // monthly
        }
        return sum + monthlyAmount;
      }, 0) || 0;

    const monthlyExpenses = scheduledTransactions?.filter(t => t.type === 'expense' && t.is_recurring)
      .reduce((sum, t) => {
        let monthlyAmount = t.amount;
        switch (t.recurrence_frequency) {
          case 'daily': monthlyAmount = t.amount * 30; break;
          case 'weekly': monthlyAmount = t.amount * 4; break;
          case 'biweekly': monthlyAmount = t.amount * 2; break;
          case 'quarterly': monthlyAmount = t.amount / 3; break;
          case 'semiannual': monthlyAmount = t.amount / 6; break;
          case 'yearly': monthlyAmount = t.amount / 12; break;
          case 'custom': monthlyAmount = t.amount * (30 / ((t.recurrence_interval || 1) * 1)); break;
          default: monthlyAmount = t.amount; // monthly
        }
        return sum + monthlyAmount;
      }, 0) || 0;

    return { monthlyIncome, monthlyExpenses };
  }, [scheduledTransactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScheduled}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Execuções</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingExecutions}</div>
            <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todayCount}</div>
            <p className="text-xs text-muted-foreground">Para executar hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Necessitam atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Impact */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Impacto Mensal Estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm text-green-600 font-medium">Receitas Recorrentes</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyImpact.monthlyIncome)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm text-red-600 font-medium">Despesas Recorrentes</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(monthlyImpact.monthlyExpenses)}</p>
            </div>
          </div>
          <div className="border-t mt-4 pt-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Saldo Estimado Mensal</p>
            <p className={`text-xl font-bold ${
              (monthlyImpact.monthlyIncome - monthlyImpact.monthlyExpenses) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(monthlyImpact.monthlyIncome - monthlyImpact.monthlyExpenses)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
