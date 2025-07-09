import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Calendar, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { GoalForm } from '@/components/goals/GoalForm';
import { GoalCard } from '@/components/goals/GoalCard';
import { MonthlyGoalCard } from '@/components/goals/MonthlyGoalCard';
import { AddAmountDialog } from '@/components/goals/AddAmountDialog';
import { useGoals, Goal } from '@/hooks/useGoals';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Goals = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();
  const [addAmountGoal, setAddAmountGoal] = useState<Goal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  const { 
    goals, 
    monthlyGoalsStatus, 
    isLoadingGoals, 
    isLoadingMonthlyStatus, 
    createGoal, 
    updateGoal, 
    deleteGoal 
  } = useGoals();

  const handleCreateOrUpdateGoal = (data: any) => {
    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, ...data });
    } else {
      createGoal.mutate(data);
    }
    setIsFormOpen(false);
    setEditingGoal(undefined);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleEditGoalById = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setEditingGoal(goal);
      setIsFormOpen(true);
    }
  };

  const handleDeleteGoal = (id: string) => {
    setDeleteGoalId(id);
  };

  const handleEditMonthlyGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleDeleteMonthlyGoal = (goal: Goal) => {
    setDeleteGoalId(goal.id);
  };

  const confirmDeleteGoal = () => {
    if (deleteGoalId) {
      deleteGoal.mutate(deleteGoalId);
      setDeleteGoalId(null);
    }
  };

  const handleAddAmount = (goal: Goal) => {
    setAddAmountGoal(goal);
  };

  const handleAddAmountSubmit = (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      const newCurrentAmount = goal.current_amount + amount;
      const status = newCurrentAmount >= goal.target_amount ? 'completed' : 'active';
      
      updateGoal.mutate({ 
        id: goalId, 
        current_amount: newCurrentAmount,
        status
      });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGoal(undefined);
  };

  if (isLoadingGoals) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Metas Financeiras</h1>
            <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const savingsGoals = goals.filter(goal => goal.goal_type === 'savings');
  const monthlyBudgetGoals = goals.filter(goal => goal.goal_type === 'monthly_budget');
  const activeGoals = goals.filter(goal => goal.status === 'active');
  const completedGoals = goals.filter(goal => goal.status === 'completed');
  const totalSaved = savingsGoals.reduce((acc, goal) => acc + goal.current_amount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Metas Financeiras</h1>
          <p className="text-gray-600 dark:text-gray-400">Defina e acompanhe seus objetivos financeiros</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Concluídas</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedGoals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Economizado</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Mensais</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{monthlyBudgetGoals.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Goals Status */}
      {monthlyGoalsStatus.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Metas Mensais</h2>
            <Badge variant="outline" className="text-sm">
              {monthlyGoalsStatus.length} meta{monthlyGoalsStatus.length !== 1 ? 's' : ''} ativa{monthlyGoalsStatus.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monthlyGoalsStatus.map((monthlyGoal) => {
              const goal = goals.find(g => g.id === monthlyGoal.goal_id);
              if (!goal) return null;
              
              return (
                <MonthlyGoalCard 
                  key={monthlyGoal.goal_id} 
                  goal={goal}
                  onEdit={handleEditMonthlyGoal}
                  onDelete={handleDeleteMonthlyGoal}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Savings Goals */}
      {savingsGoals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Metas de Economia</h2>
            <Badge variant="outline" className="text-sm">
              {savingsGoals.length} meta{savingsGoals.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {savingsGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEditGoal}
                onDelete={handleDeleteGoal}
                onAddAmount={handleAddAmount}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Nenhuma meta encontrada
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Comece criando sua primeira meta financeira!
          </p>
          <Button onClick={() => setIsFormOpen(true)} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Criar Meta
          </Button>
        </div>
      )}

      {/* Goal Form Modal */}
      <GoalForm 
        isOpen={isFormOpen} 
        onClose={handleCloseForm}
        goal={editingGoal}
        onSubmit={handleCreateOrUpdateGoal}
      />

      {/* Add Amount Dialog */}
      <AddAmountDialog
        goal={addAmountGoal}
        isOpen={addAmountGoal !== null}
        onClose={() => setAddAmountGoal(null)}
        onAddAmount={handleAddAmountSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteGoalId !== null} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGoal} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Goals;
