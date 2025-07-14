import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2
} from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  goal_type: 'savings' | 'monthly_budget';
  categories?: {
    name: string;
    color: string;
  };
}

interface GoalCardProps {
  goal: Goal;
  deletingId: string | null;
  formatCurrency: (value: number) => string;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDelete: (id: string) => void;
}

export const GoalCard = ({ 
  goal, 
  deletingId, 
  formatCurrency, 
  onConfirmDelete, 
  onCancelDelete, 
  onDelete 
}: GoalCardProps) => {
  const navigate = useNavigate();

  const getProgressPercentage = (current: number, target: number) => {
    return target > 0 ? Math.round((current / target) * 100) : 0;
  };

  const getStatusFromProgress = (current: number, target: number, goalType: string) => {
    const percentage = getProgressPercentage(current, target);
    
    if (goalType === 'monthly_budget') {
      if (percentage > 100) return 'exceeded';
      if (percentage >= 80) return 'warning';
      return 'on_track';
    } else {
      if (percentage >= 100) return 'completed';
      if (percentage >= 80) return 'warning';
      return 'on_track';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceeded':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'exceeded':
        return 'Excedido';
      case 'warning':
        return 'Atenção';
      case 'completed':
        return 'Concluído';
      default:
        return 'No prazo';
    }
  };

  const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
  const status = getStatusFromProgress(goal.current_amount, goal.target_amount, goal.goal_type);
  const categoryColor = goal.categories?.color || '#3B82F6';

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: categoryColor }}
            />
            <div>
              <CardTitle className="text-base">{goal.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {goal.categories?.name || 'Sem categoria'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className={getStatusColor(status)}>
              {getStatusIcon(status)}
              <span className="ml-1 text-xs">{getStatusText(status)}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Progresso visual */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              {formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)}
            </span>
            <span className="text-sm font-semibold text-primary">
              {progress}%
            </span>
          </div>
          <Progress 
            value={progress} 
            className="h-2"
            style={{
              backgroundColor: `${categoryColor}20`
            }}
          />
        </div>

        {/* Informações adicionais */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            {goal.goal_type === 'monthly_budget' ? 'Orçamento Mensal' : 'Meta de Poupança'}
          </span>
          <span className="font-medium">
            Restam {formatCurrency(goal.target_amount - goal.current_amount)}
          </span>
        </div>

        {/* Ações */}
        {deletingId === goal.id ? (
          // Confirmação inline
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm text-center text-muted-foreground">
              Deseja realmente excluir esta meta?
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                size="sm" 
                className="flex-1"
                onClick={() => onDelete(goal.id)}
              >
                Confirmar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onCancelDelete}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex space-x-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => navigate(`/goals/editar/${goal.id}`)}
            >
              <Edit size={14} className="mr-1" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onConfirmDelete(goal.id)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};