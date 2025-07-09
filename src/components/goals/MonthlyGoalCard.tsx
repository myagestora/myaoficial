
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import { MonthlyGoalStatus } from '@/hooks/useGoals';

interface MonthlyGoalCardProps {
  monthlyGoal: MonthlyGoalStatus;
  onEdit?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
}

export const MonthlyGoalCard = ({ monthlyGoal, onEdit, onDelete }: MonthlyGoalCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'exceeded':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'No Limite';
      case 'warning':
        return 'Atenção';
      case 'exceeded':
        return 'Excedido';
      default:
        return 'Indefinido';
    }
  };

  const getStatusMessage = () => {
    const remaining = monthlyGoal.target_amount - monthlyGoal.spent_amount;
    if (remaining > 0) {
      return `Restam R$ ${remaining.toFixed(2)}`;
    } else {
      return `Excedeu em R$ ${Math.abs(remaining).toFixed(2)}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: monthlyGoal.category_color }}
              />
              {monthlyGoal.category_name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(monthlyGoal.month_year + '-01').toLocaleDateString('pt-BR', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor(monthlyGoal.status)}>
              {getStatusText(monthlyGoal.status)}
            </Badge>
            <div className="flex gap-1">
              {onEdit && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onEdit(monthlyGoal.goal_id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(monthlyGoal.goal_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span className="font-medium">{monthlyGoal.percentage.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(monthlyGoal.percentage, 100)} className="h-2" />
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>R$ {monthlyGoal.spent_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>R$ {monthlyGoal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className={`text-sm font-medium ${
            monthlyGoal.spent_amount <= monthlyGoal.target_amount 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {getStatusMessage()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
