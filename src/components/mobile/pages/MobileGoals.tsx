import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useGoals } from '@/hooks/useGoals';
import { GoalCard } from './GoalCard';

export const MobileGoals = () => {
  const { goals, isLoadingGoals, deleteGoal } = useGoals();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Função para confirmar exclusão
  const confirmDelete = (goalId: string) => {
    setDeletingId(goalId);
  };

  // Função para cancelar exclusão
  const cancelDelete = () => {
    setDeletingId(null);
  };

  // Função para deletar meta
  const handleDelete = (goalId: string) => {
    deleteGoal.mutate(goalId);
    setDeletingId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              deletingId={deletingId}
              formatCurrency={formatCurrency}
              onConfirmDelete={confirmDelete}
              onCancelDelete={cancelDelete}
              onDelete={handleDelete}
            />
          ))
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