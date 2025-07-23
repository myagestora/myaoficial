import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useGoals } from '@/hooks/useGoals';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle, Edit, Trash2, PiggyBank, Calendar } from 'lucide-react';

export const MobileGoals = () => {
  const { goals, isLoadingGoals, deleteGoal } = useGoals();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const confirmDelete = (goalId: string) => setDeletingId(goalId);
  const cancelDelete = () => setDeletingId(null);
  const handleDelete = (goalId: string) => { deleteGoal.mutate(goalId); setDeletingId(null); };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const getProgress = (current: number, target: number) => target > 0 ? Math.round((current / target) * 100) : 0;
  const getStatus = (current: number, target: number, type: string) => {
    const pct = getProgress(current, target);
    if (type === 'monthly_budget') return pct > 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'on_track';
    return pct >= 100 ? 'completed' : pct >= 80 ? 'warning' : 'on_track';
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceeded': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <TrendingUp className="h-4 w-4 text-blue-500" />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'exceeded': return 'Excedido';
      case 'warning': return 'Atenção';
      case 'completed': return 'Concluído';
      default: return 'No prazo';
    }
  };

  // Agrupar metas por tipo
  const savingsGoals = goals.filter(g => g.goal_type === 'savings');
  const budgetGoals = goals.filter(g => g.goal_type === 'monthly_budget');

  return (
    <MobilePageWrapper className="bg-[#F6F8FA] min-h-screen p-2 space-y-3 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Target className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Metas</h1>
          <p className="text-[11px] text-gray-400">Acompanhe e gerencie suas metas financeiras</p>
        </div>
        <div className="ml-auto">
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md border-0 px-3 h-9 text-sm"
            onClick={() => navigate('/goals/nova')}
          >
            <Plus size={15} className="mr-1" />
            Nova
          </Button>
        </div>
      </div>

      {/* Agrupamento por tipo */}
      {savingsGoals.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1 pl-1">
            <PiggyBank className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Metas de Economia</span>
          </div>
          <div className="space-y-3">
            {savingsGoals.map(goal => {
              const progress = getProgress(goal.current_amount, goal.target_amount);
              const status = getStatus(goal.current_amount, goal.target_amount, goal.goal_type);
              const categoryColor = goal.categories?.color || '#3B82F6';
              return (
                <Card key={goal.id} className="p-0 border border-emerald-100 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: categoryColor }} />
                      <span className="font-semibold text-sm text-gray-900 truncate flex-1">{goal.title}</span>
                      <Badge variant="secondary" className={getStatusColor(status)}>{getStatusIcon(status)}<span className="ml-1 text-xs">{getStatusText(status)}</span></Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Economizado</span>
                      <span>{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-emerald-100" style={{ backgroundColor: `${categoryColor}20` }} />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{goal.target_date ? (<><Calendar className="inline w-3 h-3 mr-1" />Até {goal.target_date.split('-').reverse().join('/')}</>) : 'Meta de Poupança'}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="p-1" onClick={() => navigate(`/goals/editar/${goal.id}`)}><Edit size={14} /></Button>
                        <Button size="icon" variant="ghost" className="p-1" onClick={() => confirmDelete(goal.id)}><Trash2 size={14} /></Button>
                      </div>
                    </div>
                    {deletingId === goal.id && (
                      <div className="mt-2 flex flex-col gap-2 bg-red-50 border border-red-200 rounded p-2">
                        <span className="text-xs text-red-700 text-center">Deseja realmente excluir esta meta?</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDelete(goal.id)}>Confirmar</Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={cancelDelete}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      {budgetGoals.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1 pl-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Orçamento Mensal</span>
          </div>
          <div className="space-y-3">
            {budgetGoals.map(goal => {
              const progress = getProgress(goal.current_amount, goal.target_amount);
              const status = getStatus(goal.current_amount, goal.target_amount, goal.goal_type);
              const categoryColor = goal.categories?.color || '#3B82F6';
              return (
                <Card key={goal.id} className="p-0 border border-blue-100 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: categoryColor }} />
                      <span className="font-semibold text-sm text-gray-900 truncate flex-1">{goal.title}</span>
                      <Badge variant="secondary" className={getStatusColor(status)}>{getStatusIcon(status)}<span className="ml-1 text-xs">{getStatusText(status)}</span></Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Gasto</span>
                      <span>{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-blue-100" style={{ backgroundColor: `${categoryColor}20` }} />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{goal.month_year ? (<><Calendar className="inline w-3 h-3 mr-1" />{goal.month_year.split('-').reverse().join('/')}</>) : 'Orçamento Mensal'}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="p-1" onClick={() => navigate(`/goals/editar/${goal.id}`)}><Edit size={14} /></Button>
                        <Button size="icon" variant="ghost" className="p-1" onClick={() => confirmDelete(goal.id)}><Trash2 size={14} /></Button>
                      </div>
                    </div>
                    {deletingId === goal.id && (
                      <div className="mt-2 flex flex-col gap-2 bg-red-50 border border-red-200 rounded p-2">
                        <span className="text-xs text-red-700 text-center">Deseja realmente excluir esta meta?</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDelete(goal.id)}>Confirmar</Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={cancelDelete}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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
    </MobilePageWrapper>
  );
};