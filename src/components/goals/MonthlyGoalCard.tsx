import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { Goal } from '@/hooks/useGoals';

interface MonthlyGoalCardProps {
  goal: Goal & {
    spentAmount?: number;
    remainingAmount?: number;
    progressPercentage?: number;
  };
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export const MonthlyGoalCard: React.FC<MonthlyGoalCardProps> = ({ 
  goal, 
  onEdit, 
  onDelete 
}) => {
  const isMonthlyBudget = goal.goal_type === 'monthly_budget';
  const spentAmount = goal.spentAmount || Number(goal.current_amount || 0);
  const targetAmount = Number(goal.target_amount || 0);
  const remainingAmount = targetAmount - spentAmount;
  
  // Para metas de gastos mensais: calcular progresso como "segurança dentro da meta"
  // Para metas de economia: calcular progresso tradicional
  let progressPercentage;
  let progressColor;
  let statusText;
  
  if (isMonthlyBudget) {
    const usagePercentage = targetAmount > 0 ? (spentAmount / targetAmount) * 100 : 0;
    
    if (spentAmount <= targetAmount) {
      // Está dentro da meta - mostrar como progresso positivo
      progressPercentage = Math.max(0, 100 - usagePercentage);
      progressColor = progressPercentage > 50 ? 'text-green-600' : progressPercentage > 20 ? 'text-yellow-600' : 'text-orange-600';
      statusText = `Dentro da meta - ${progressPercentage.toFixed(1)}% de margem`;
    } else {
      // Ultrapassou a meta
      progressPercentage = 0;
      progressColor = 'text-red-600';
      statusText = `Meta ultrapassada em ${(usagePercentage - 100).toFixed(1)}%`;
    }
  } else {
    // Meta de economia tradicional
    progressPercentage = targetAmount > 0 ? (spentAmount / targetAmount) * 100 : 0;
    progressColor = progressPercentage >= 100 ? 'text-green-600' : progressPercentage >= 75 ? 'text-blue-600' : 'text-orange-600';
    statusText = `${progressPercentage.toFixed(1)}% da meta alcançada`;
  }

  // Formatar o mês/ano para exibição - CORRIGINDO O PROBLEMA DA DATA
  const monthYear = goal.month_year ? 
    (() => {
      const [year, month] = goal.month_year.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1); // Subtraindo 1 do mês porque Date usa índice 0-11
      return date.toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long' 
      });
    })() :
    goal.target_date ? 
      new Date(goal.target_date).toLocaleDateString('pt-BR') : 
      'Data não definida';

  const getStatusBadge = () => {
    if (isMonthlyBudget) {
      if (spentAmount <= targetAmount) {
        return <Badge variant="default" className="bg-green-100 text-green-800">Dentro da Meta</Badge>;
      } else {
        return <Badge variant="destructive">Meta Ultrapassada</Badge>;
      }
    } else {
      if (progressPercentage >= 100) {
        return <Badge variant="default" className="bg-green-100 text-green-800">Concluída</Badge>;
      } else if (progressPercentage >= 75) {
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Em Progresso</Badge>;
      } else {
        return <Badge variant="outline">Iniciada</Badge>;
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: goal.categories?.color || '#3B82F6' }}
            />
            <CardTitle className="text-lg">{goal.title}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            { /*{getStatusBadge()} */}
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(goal)}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(goal)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {goal.description && (
          <p className="text-sm text-muted-foreground">{goal.description}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informações da meta */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{monthYear}</span>
          </div>
          {goal.categories && (
            <span className="text-muted-foreground">
              {goal.categories.name}
            </span>
          )}
        </div>

        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso</span>
            <span className={`text-sm font-medium ${progressColor}`}>
              {statusText}
            </span>
          </div>
          <Progress 
            value={Math.min(progressPercentage, 100)} 
            className="h-2"
          />
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {isMonthlyBudget ? 'Orçamento' : 'Meta'}
            </p>
            <p className="text-sm font-medium">
              R$ {targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {isMonthlyBudget ? 'Gasto' : 'Atual'}
            </p>
            <p className="text-sm font-medium">
              R$ {spentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Informação adicional */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isMonthlyBudget ? 
                (remainingAmount >= 0 ? 'Restante no orçamento' : 'Valor excedido') : 
                'Falta para a meta'
              }
            </span>
            <span className={`text-sm font-medium ${
              isMonthlyBudget ? 
                (remainingAmount >= 0 ? 'text-green-600' : 'text-red-600') : 
                'text-blue-600'
            }`}>
              R$ {Math.abs(remainingAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
