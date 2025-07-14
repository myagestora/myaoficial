import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  PauseCircle,
  TrendingUp,
  TrendingDown 
} from 'lucide-react';

interface MobileScheduledStatsProps {
  totalScheduled: number;
  activeScheduled: number;
  pausedScheduled: number;
  upcomingExecutions: number;
  overdueScheduled: number;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
}

export const MobileScheduledStats = ({ 
  totalScheduled, 
  activeScheduled,
  pausedScheduled,
  upcomingExecutions, 
  overdueScheduled,
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
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary">{totalScheduled}</div>
            <p className="text-xs text-muted-foreground">Total Agendadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{upcomingExecutions}</div>
            <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-600">{activeScheduled}</div>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <PauseCircle className="h-6 w-6 text-gray-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-gray-500">{pausedScheduled}</div>
            <p className="text-xs text-muted-foreground">Pausadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-red-600">{overdueScheduled}</div>
            <p className="text-xs text-muted-foreground">Atrasadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Impact */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Impacto Mensal Estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600 font-medium">Receitas</span>
              </div>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalMonthlyIncome)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                <span className="text-sm text-red-600 font-medium">Despesas</span>
              </div>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalMonthlyExpenses)}</p>
            </div>
          </div>
          <div className="border-t mt-3 pt-3 text-center">
            <p className="text-sm text-muted-foreground">Saldo estimado</p>
            <p className={`text-lg font-bold ${
              (totalMonthlyIncome - totalMonthlyExpenses) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(totalMonthlyIncome - totalMonthlyExpenses)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};