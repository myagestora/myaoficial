
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  goal_type: 'savings' | 'monthly_budget';
  category_id?: string;
  month_year?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  created_at: string;
  updated_at: string;
  categories?: {
    name: string;
    color: string;
  };
}

export interface MonthlyGoalStatus {
  goal_id: string;
  category_name: string;
  category_color: string;
  target_amount: number;
  spent_amount: number;
  percentage: number;
  status: 'on_track' | 'warning' | 'exceeded';
  month_year: string;
}

export const useGoals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: goals, isLoading: isLoadingGoals } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('goals')
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching goals:', error);
        return [];
      }

      // Para metas mensais, calcular o current_amount baseado nos gastos reais
      const goalsWithCalculatedAmounts = await Promise.all(
        (data || []).map(async (goal) => {
          if (goal.goal_type === 'monthly_budget' && goal.category_id && goal.month_year) {
            // Buscar gastos reais da categoria no mês
            const { data: transactions, error: transError } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', user.id)
              .eq('category_id', goal.category_id)
              .eq('type', 'expense')
              .gte('date', goal.month_year + '-01')
              .lt('date', new Date(new Date(goal.month_year + '-01').getFullYear(), new Date(goal.month_year + '-01').getMonth() + 1, 1).toISOString().split('T')[0]);

            if (!transError && transactions) {
              const spentAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
              
              // Atualizar o current_amount se for diferente do calculado
              if (Math.abs(goal.current_amount - spentAmount) > 0.01) {
                const { error: updateError } = await supabase
                  .from('goals')
                  .update({ current_amount: spentAmount })
                  .eq('id', goal.id);

                if (updateError) {
                  console.error('Error updating goal current_amount:', updateError);
                }
              }

              return { ...goal, current_amount: spentAmount };
            }
          }
          return goal;
        })
      );

      return goalsWithCalculatedAmounts as Goal[];
    },
    enabled: !!user?.id
  });

  const { data: monthlyGoalsStatus, isLoading: isLoadingMonthlyStatus } = useQuery({
    queryKey: ['monthly-goals-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .rpc('get_monthly_goals_status', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching monthly goals status:', error);
        return [];
      }

      return data as MonthlyGoalStatus[];
    },
    enabled: !!user?.id
  });

  const createGoal = useMutation({
    mutationFn: async (goalData: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Para metas mensais, calcular o current_amount baseado nos gastos já existentes
      let calculatedCurrentAmount = goalData.current_amount || 0;
      
      if (goalData.goal_type === 'monthly_budget' && goalData.category_id && goalData.month_year) {
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('category_id', goalData.category_id)
          .eq('type', 'expense')
          .gte('date', goalData.month_year + '-01')
          .lt('date', new Date(new Date(goalData.month_year + '-01').getFullYear(), new Date(goalData.month_year + '-01').getMonth() + 1, 1).toISOString().split('T')[0]);

        if (!transError && transactions) {
          calculatedCurrentAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        }
      }

      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...goalData,
          current_amount: calculatedCurrentAmount,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-goals-status'] });
      toast({
        title: 'Sucesso!',
        description: 'Meta criada com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao criar meta.',
        variant: 'destructive',
      });
    }
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...goalData }: Partial<Goal> & { id: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(goalData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-goals-status'] });
      toast({
        title: 'Sucesso!',
        description: 'Meta atualizada com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao atualizar meta.',
        variant: 'destructive',
      });
    }
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-goals-status'] });
      toast({
        title: 'Sucesso!',
        description: 'Meta excluída com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting goal:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao excluir meta.',
        variant: 'destructive',
      });
    }
  });

  return {
    goals: goals || [],
    monthlyGoalsStatus: monthlyGoalsStatus || [],
    isLoadingGoals,
    isLoadingMonthlyStatus,
    createGoal,
    updateGoal,
    deleteGoal
  };
};
