import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// Não buscar metas aqui, receber por props igual ao mobile
import { CheckCircle, AlertTriangle, Target } from 'lucide-react';

interface GoalsReportsBlockDesktopProps {
  goalsData: any[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const GoalsReportsBlockDesktop: React.FC<GoalsReportsBlockDesktopProps> = ({ goalsData, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Relatórios de Metas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Carregando metas...</div>
        </CardContent>
      </Card>
    );
  }

  if (!goalsData || goalsData.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Relatórios de Metas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Nenhuma meta encontrada</div>
        </CardContent>
      </Card>
    );
  }

  // Separar por tipo
  const savingsGoals = goalsData.filter((g: any) => g.goal_type === 'savings').map((goal: any) => {
    const currentAmount = Number(goal.current_amount || 0);
    const targetAmount = Number(goal.target_amount || 0);
    const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    let status = 'on_track';
    if (progressPercentage >= 100) status = 'completed';
    else if (progressPercentage >= 75) status = 'on_track';
    else status = 'behind';
    return { ...goal, currentAmount, targetAmount, progressPercentage, status };
  });
  const budgetGoals = goalsData.filter((g: any) => g.goal_type === 'monthly_budget').map((goal: any) => {
    const spentAmount = Number(goal.current_amount || 0);
    const targetAmount = Number(goal.target_amount || 0);
    const usagePercentage = targetAmount > 0 ? (spentAmount / targetAmount) * 100 : 0;
    let status = 'on_track';
    if (usagePercentage >= 100) status = 'exceeded';
    else if (usagePercentage >= 75) status = 'warning';
    else if (usagePercentage === 0) status = 'behind';
    else status = 'on_track';
    return { ...goal, spentAmount, targetAmount, usagePercentage, status };
  });

  function statusLabel(goal: any) {
    if (goal.status === 'completed') return <span className="text-green-700 font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Concluída</span>;
    if (goal.status === 'exceeded') return <span className="text-red-700 font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Excedida</span>;
    if (goal.status === 'warning') return <span className="text-yellow-700 font-bold flex items-center gap-1"><Target className="w-4 h-4" /> Atenção</span>;
    if (goal.status === 'on_track') return <span className="text-blue-700 font-bold flex items-center gap-1">No prazo</span>;
    return <span className="text-gray-700 font-bold flex items-center gap-1">Em andamento</span>;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">Relatórios de Metas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {savingsGoals.length > 0 && (
          <div>
            <div className="font-semibold text-sm text-purple-700 mb-2">Metas de Poupança</div>
            {savingsGoals.map((goal: any) => (
              <div key={goal.id} className={`border rounded-lg p-4 mb-3 ${goal.status === 'completed' ? 'border-green-400 bg-green-50/40' : goal.status === 'exceeded' ? 'border-red-400 bg-red-50/40' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-base">{goal.title}</span>
                  {statusLabel(goal)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Progresso: {formatCurrency(goal.currentAmount ?? 0)} de {formatCurrency(goal.targetAmount ?? 0)}
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(goal.progressPercentage ?? 0, 100)}%` }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{!isNaN(goal.progressPercentage) ? goal.progressPercentage.toFixed(1) : '0.0'}%</div>
              </div>
            ))}
          </div>
        )}
        {budgetGoals.length > 0 && (
          <div>
            <div className="font-semibold text-sm text-blue-700 mb-2">Metas de Orçamento Mensal</div>
            {budgetGoals.map((goal: any) => (
              <div key={goal.id} className={`border rounded-lg p-4 mb-3 ${goal.status === 'completed' ? 'border-green-400 bg-green-50/40' : goal.status === 'exceeded' ? 'border-red-400 bg-red-50/40' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-base">{goal.title}</span>
                  {statusLabel(goal)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Gasto: {formatCurrency(goal.spentAmount ?? 0)} de {formatCurrency(goal.targetAmount ?? 0)}
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div className={`h-2 rounded-full ${goal.status === 'exceeded' ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(goal.usagePercentage ?? 0, 100)}%` }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{!isNaN(goal.usagePercentage) ? goal.usagePercentage.toFixed(1) : '0.0'}%</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 