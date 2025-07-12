import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Target,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Edit,
  Trash2
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useGoals } from '@/hooks/useGoals';

export const MobileGoals = () => {
  const { goals, isLoadingGoals, deleteGoal } = useGoals();
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  return (
    <MobilePageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Target className="h-6 w-6 mr-2" />
          Metas
        </h1>
        <Button 
          size="sm" 
          className="flex items-center space-x-2"
          onClick={() => navigate('/goals/nova')}
        >
          <Plus size={16} />
          <span>Nova Meta</span>
        </Button>
      </div>

      {/* Resumo das metas */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo das Metas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{goals.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {goals.filter(g => getStatusFromProgress(g.current_amount, g.target_amount, g.goal_type) === 'on_track').length}
              </p>
              <p className="text-xs text-muted-foreground">No prazo</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {goals.filter(g => getStatusFromProgress(g.current_amount, g.target_amount, g.goal_type) === 'warning').length}
              </p>
              <p className="text-xs text-muted-foreground">Atenção</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de metas */}
      <div className="space-y-4">
        {isLoadingGoals ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          goals.map((goal) => {
            const progress = getProgressPercentage(goal.current_amount, goal.target_amount);
            const status = getStatusFromProgress(goal.current_amount, goal.target_amount, goal.goal_type);
            const categoryColor = goal.categories?.color || '#3B82F6';
            
            return (
              <Card key={goal.id} className="hover:shadow-sm transition-shadow">
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
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <DollarSign size={14} className="mr-1" />
                      Adicionar Valor
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/goals/editar/${goal.id}`)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const confirmed = window.confirm(`Tem certeza que deseja excluir a meta "${goal.title}"? Esta ação não pode ser desfeita.`);
                        if (confirmed) {
                          deleteGoal.mutate(goal.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Estado vazio */}
      {!isLoadingGoals && goals.length === 0 && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">Nenhuma meta encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Comece definindo sua primeira meta financeira
            </p>
            <Button onClick={() => navigate('/goals/nova')}>
              <Plus size={16} className="mr-2" />
              Nova Meta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dicas */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Target className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 text-sm">Dica sobre Metas</h3>
              <p className="text-xs text-blue-700 mt-1">
                Defina metas realistas e acompanhe seu progresso regularmente. 
                Pequenos passos levam a grandes resultados!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </MobilePageWrapper>
  );
};