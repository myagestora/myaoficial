
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { MonthlyGoalStatus } from '@/hooks/useGoals';

interface MonthlyGoalCardProps {
  monthlyGoal: MonthlyGoalStatus;
}

export const MonthlyGoalCard = ({ monthlyGoal }: MonthlyGoalCardProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'on_track':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900',
          text: 'No Limite',
          description: 'Gastos dentro do esperado'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900',
          text: 'Atenção',
          description: 'Próximo do limite'
        };
      case 'exceeded':
        return {
          icon: TrendingUp,
          color: 'text-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900',
          text: 'Excedido',
          description: 'Limite ultrapassado'
        };
      default:
        return {
          icon: CheckCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100 dark:bg-gray-900',
          text: 'Indefinido',
          description: ''
        };
    }
  };

  const statusConfig = getStatusConfig(monthlyGoal.status);
  const StatusIcon = statusConfig.icon;
  const remaining = monthlyGoal.target_amount - monthlyGoal.spent_amount;

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{monthlyGoal.category_name}</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(monthlyGoal.month_year + '-01').toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="secondary"
              style={{ 
                backgroundColor: monthlyGoal.category_color + '20',
                color: monthlyGoal.category_color,
                borderColor: monthlyGoal.category_color
              }}
            >
              {monthlyGoal.category_name}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso</span>
            <div className="flex items-center space-x-2">
              <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
              <span className={`text-sm font-medium ${statusConfig.color}`}>
                {monthlyGoal.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <Progress 
            value={Math.min(monthlyGoal.percentage, 100)} 
            className="h-2"
          />
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Gasto: R$ {monthlyGoal.spent_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Meta: R$ {monthlyGoal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className={`rounded-lg p-3 ${statusConfig.bgColor}`}>
          <div className="flex items-center space-x-2">
            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
            <span className={`font-medium ${statusConfig.color}`}>
              {statusConfig.text}
            </span>
          </div>
          <p className={`text-sm mt-1 ${statusConfig.color}`}>
            {statusConfig.description}
          </p>
          {remaining > 0 ? (
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
              Restam R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          ) : (
            <p className="text-sm mt-1 text-red-600">
              Excedido em R$ {Math.abs(remaining).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
