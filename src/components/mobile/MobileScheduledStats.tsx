import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  PauseCircle,
  TrendingUp,
  TrendingDown,
  CalendarDays
} from 'lucide-react';

interface MobileScheduledStatsProps {
  upcomingExecutions: number;
  todayScheduled: number;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
}

export const MobileScheduledStats = ({ 
  upcomingExecutions,
  todayScheduled, 
  totalMonthlyIncome,
  totalMonthlyExpenses
}: MobileScheduledStatsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Main Stats - 2 cards em 1x2 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{upcomingExecutions}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400">A partir de amanhã</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 text-center">
            <CalendarDays className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{todayScheduled}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Impact */}
      <Card className="bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 border-slate-300 dark:border-slate-600">
        <CardHeader className="pb-3 text-center">
          <CardTitle className="text-base flex items-center justify-center text-slate-800 dark:text-slate-200">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Impacto Mensal Estimado
          </CardTitle>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Transações recorrentes
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className="bg-emerald-500 p-1 rounded-full">
                    <TrendingUp className="h-3 w-3 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Receitas</p>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalMonthlyIncome)}</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 p-2 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className="bg-red-500 p-1 rounded-full">
                    <TrendingDown className="h-3 w-3 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-red-800 dark:text-red-200">Despesas</p>
                <p className="text-xs font-bold text-red-700 dark:text-red-300">{formatCurrency(totalMonthlyExpenses)}</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 p-2 rounded-lg border border-slate-300 dark:border-slate-600">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className={`p-1 rounded-full ${
                    (totalMonthlyIncome - totalMonthlyExpenses) >= 0 
                      ? 'bg-emerald-500' 
                      : 'bg-red-500'
                  }`}>
                    <TrendingUp className="h-3 w-3 text-white" />
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Saldo</p>
                <p className={`text-xs font-bold ${
                  (totalMonthlyIncome - totalMonthlyExpenses) >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(totalMonthlyIncome - totalMonthlyExpenses)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};