
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Edit, Trash2, Plus } from 'lucide-react';
import { Goal } from '@/hooks/useGoals';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onAddAmount?: (goal: Goal) => void;
}

export const GoalCard = ({ goal, onEdit, onDelete, onAddAmount }: GoalCardProps) => {
  const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  const daysLeft = goal.target_date 
    ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'active':
        return 'Em Andamento';
      case 'paused':
        return 'Pausada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Indefinido';
    }
  };

  const getGoalTypeText = (type: string) => {
    return type === 'monthly_budget' ? 'Meta Mensal' : 'Meta de Economia';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{goal.title}</CardTitle>
            {goal.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {goal.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor(goal.status)}>
              {getStatusText(goal.status)}
            </Badge>
            <Badge variant="outline">{getGoalTypeText(goal.goal_type)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>R$ {goal.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>R$ {goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-4">
            {goal.target_date && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>
                  {daysLeft !== null ? (
                    daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo vencido'
                  ) : (
                    new Date(goal.target_date).toLocaleDateString('pt-BR')
                  )}
                </span>
              </div>
            )}
            {goal.categories && (
              <Badge 
                variant="secondary"
                style={{ 
                  backgroundColor: goal.categories.color + '20',
                  color: goal.categories.color,
                  borderColor: goal.categories.color
                }}
              >
                {goal.categories.name}
              </Badge>
            )}
            {goal.month_year && (
              <Badge variant="outline">
                {new Date(goal.month_year + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Badge>
            )}
          </div>
        </div>

        {goal.status !== 'completed' && goal.status !== 'cancelled' && (
          <div className="flex space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(goal)}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            {goal.goal_type === 'savings' && onAddAmount && (
              <Button size="sm" onClick={() => onAddAmount(goal)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Valor
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete(goal.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
