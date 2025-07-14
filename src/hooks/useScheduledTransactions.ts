
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export const useScheduledTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: scheduledTransactions, isLoading } = useQuery({
    queryKey: ['scheduled-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          description,
          amount,
          type,
          date,
          is_recurring,
          recurrence_frequency,
          recurrence_interval,
          recurrence_end_date,
          next_recurrence_date,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .or(`is_recurring.eq.true,date.gte.${new Date().toISOString().split('T')[0]}`)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching scheduled transactions:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  const toggleRecurringStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          is_recurring: isActive,
          next_recurrence_date: isActive ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Status do agendamento atualizado.',
      });
    },
    onError: (error) => {
      console.error('Error updating recurring status:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao atualizar agendamento.',
        variant: 'destructive',
      });
    }
  });

  const deleteScheduledTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Agendamento excluído com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting scheduled transaction:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao excluir agendamento.',
        variant: 'destructive',
      });
    }
  });

  return {
    scheduledTransactions: scheduledTransactions || [],
    isLoading,
    toggleRecurringStatus,
    deleteScheduledTransaction
  };
};
