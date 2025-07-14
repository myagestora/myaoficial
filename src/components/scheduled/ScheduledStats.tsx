
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';
import { useScheduledTransactions } from '@/hooks/useScheduledTransactions';
import { startOfDay, isAfter, addDays } from 'date-fns';

interface ScheduledStatsProps {
  upcomingExecutions: number;
  todayCount: number;
}

export const ScheduledStats = ({ 
  upcomingExecutions, 
  todayCount 
}: ScheduledStatsProps) => {
  const { scheduledTransactions } = useScheduledTransactions();

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Próximas Execuções</CardTitle>
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{upcomingExecutions}</div>
            <p className="text-sm text-blue-600 dark:text-blue-400">A partir de amanhã</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Hoje</CardTitle>
            <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{todayCount}</div>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Para executar hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Impact */}
      <Card className="bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600 shadow-lg">
        <CardHeader className="pb-4 text-center">
          <CardTitle className="text-xl flex items-center justify-center text-slate-800 dark:text-slate-200">
            <TrendingUp className="h-6 w-6 mr-3 text-primary" />
            Impacto Mensal Estimado
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Projeção baseada em transações recorrentes
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-emerald-500 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">Receitas Recorrentes</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(monthlyImpact.monthlyIncome)}</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 p-6 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-red-500 p-3 rounded-full">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Despesas Recorrentes</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{formatCurrency(monthlyImpact.monthlyExpenses)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 p-6 rounded-xl border border-slate-300 dark:border-slate-600">
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Saldo Estimado Mensal</p>
              <p className={`text-4xl font-bold ${
                (monthlyImpact.monthlyIncome - monthlyImpact.monthlyExpenses) >= 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(monthlyImpact.monthlyIncome - monthlyImpact.monthlyExpenses)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                {(monthlyImpact.monthlyIncome - monthlyImpact.monthlyExpenses) >= 0 
                  ? 'Resultado positivo do mês' 
                  : 'Atenção: saldo negativo'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
