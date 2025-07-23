import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface GoalsReportsBlockProps {
  dateRange: DateRange | undefined;
}

export const GoalsReportsBlock: React.FC<GoalsReportsBlockProps> = ({ dateRange }) => {
  const { user } = useAuth();

  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['reports-goals', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: goals, error } = await supabase
        .from('goals')
        .select(`*, categories (name, color)`)
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (error) throw error;
      const relevantGoals = goals?.filter(goal => {
        if (!dateRange?.from || !dateRange?.to) return true;
        if (goal.goal_type === 'monthly_budget' && goal.month_year) {
          const [goalYear, goalMonth] = goal.month_year.split('-').map(Number);
          const goalDate = new Date(goalYear, goalMonth - 1, 1);
          const fromMonth = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 1);
          const toMonth = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), 1);
          return goalDate >= fromMonth && goalDate <= toMonth;
        }
        if (goal.goal_type === 'savings' && goal.target_date) {
          const targetDate = new Date(goal.target_date);
          return targetDate >= dateRange.from && targetDate <= dateRange.to;
        }
        return true;
      }) || [];
      const goalsWithProgress = await Promise.all(
        relevantGoals.map(async (goal) => {
          if (goal.goal_type === 'monthly_budget' && goal.category_id && goal.month_year) {
            const [goalYear, goalMonth] = goal.month_year.split('-').map(Number);
            const startDate = new Date(goalYear, goalMonth - 1, 1);
            const endDate = new Date(goalYear, goalMonth, 1);
            const { data: transactions } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', user.id)
              .eq('category_id', goal.category_id)
              .eq('type', 'expense')
              .gte('date', startDate.toISOString().split('T')[0])
              .lt('date', endDate.toISOString().split('T')[0]);
            const spentAmount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
            const targetAmount = Number(goal.target_amount || 0);
            const usagePercentage = targetAmount > 0 ? (spentAmount / targetAmount) * 100 : 0;
            let remainingAmount: number;
            let exceededAmount: number = 0;
            if (spentAmount <= targetAmount) {
              remainingAmount = targetAmount - spentAmount;
            } else {
              remainingAmount = 0;
              exceededAmount = spentAmount - targetAmount;
            }
            return {
              ...goal,
              spentAmount,
              remainingAmount,
              exceededAmount,
              usagePercentage,
              status: spentAmount <= targetAmount ? 'on_track' : 'exceeded',
              monthName: new Date(goalYear, goalMonth - 1, 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
            };
          } else {
            const currentAmount = Number(goal.current_amount || 0);
            const targetAmount = Number(goal.target_amount || 0);
            const remainingAmount = Math.max(0, targetAmount - currentAmount);
            const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            return {
              ...goal,
              currentAmount,
              remainingAmount,
              progressPercentage,
              status: progressPercentage >= 100 ? 'completed' : progressPercentage >= 75 ? 'on_track' : 'behind'
            };
          }
        })
      );
      return goalsWithProgress;
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <Card className="mb-3">
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
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Relatórios de Metas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Nenhuma meta encontrada</div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'on_track':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'exceeded':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'behind':
        return <TrendingDown className="h-4 w-4 text-orange-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Meta Alcançada';
      case 'on_track':
        return 'Dentro da Meta';
      case 'exceeded':
        return 'Meta Ultrapassada';
      case 'behind':
        return 'Atrás da Meta';
      default:
        return 'Em Progresso';
    }
  };

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">Relatórios de Metas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goalsData.map((goal: any) => (
          <div key={goal.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: goal.categories?.color || '#3B82F6' }}
                />
                <h3 className="font-medium">{goal.title}</h3>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(goal.status)}
                <span className={`font-medium ${
                  goal.status === 'completed' ? 'text-green-600' :
                  goal.status === 'on_track' ? 'text-blue-600' :
                  goal.status === 'exceeded' ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {getStatusText(goal.status)}
                </span>
              </div>
            </div>
            {goal.goal_type === 'monthly_budget' ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Período</p>
                    <p className="font-medium">{goal.monthName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Orçamento</p>
                    <p className="font-medium">R$ {Number(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gasto</p>
                    <p className="font-medium">R$ {goal.spentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{goal.status === 'exceeded' ? 'Ultrapassou' : 'Restante'}</p>
                    <p className={`font-medium ${goal.status === 'exceeded' ? 'text-red-600' : 'text-green-600'}`}>
                      R$ {goal.status === 'exceeded' ? 
                        goal.exceededAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) :
                        goal.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                      }
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Utilização do Orçamento</span>
                    <span className={`font-medium ${goal.usagePercentage > 100 ? 'text-red-600' : 'text-blue-600'}`}>
                      {goal.usagePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        goal.usagePercentage > 100 ? 'bg-red-500' : 
                        goal.usagePercentage > 80 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(goal.usagePercentage, 100)}%` }}
                    />
                  </div>
                </div>
                {goal.status === 'on_track' ? (
                  <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    ✅ Parabéns! Você está dentro do orçamento previsto. 
                    Economizou R$ {goal.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
                  </p>
                ) : (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    ⚠️ Atenção! Você ultrapassou o orçamento em R$ {goal.exceededAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Meta</p>
                    <p className="font-medium">R$ {Number(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Economizado</p>
                    <p className="font-medium">R$ {goal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Restante</p>
                    <p className="font-medium text-blue-600">R$ {goal.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{goal.target_date ? 'Data Limite' : 'Progresso'}</p>
                    <p className="font-medium">
                      {goal.target_date ? format(new Date(goal.target_date), 'dd/MM/yyyy') : `${goal.progressPercentage.toFixed(1)}%`}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span className="font-medium text-green-600">{goal.progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}; 