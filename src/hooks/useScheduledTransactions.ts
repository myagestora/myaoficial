
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

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          description,
          amount,
          type,
          date,
          category_id,
          is_recurring,
          is_parent_template,
          parent_transaction_id,
          recurrence_frequency,
          recurrence_interval,
          recurrence_end_date,
          next_recurrence_date,
          categories (
            id,
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .gte('date', today)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching scheduled transactions:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  // Função para editar uma transação específica
  const editTransaction = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('transactions')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Transação atualizada com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating transaction:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao atualizar transação.',
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
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Transação excluída com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting scheduled transaction:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao excluir transação.',
        variant: 'destructive',
      });
    }
  });

  const deleteRecurringSeries = useMutation({
    mutationFn: async (parentId: string) => {
      // Excluir todas as transações filhas e o pai
      const { error: childrenError } = await supabase
        .from('transactions')
        .delete()
        .eq('parent_transaction_id', parentId);

      if (childrenError) throw childrenError;

      // Excluir a transação pai
      const { error: parentError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', parentId);

      if (parentError) throw parentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Série de transações excluída com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting recurring series:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao excluir série de transações.',
        variant: 'destructive',
      });
    }
  });

  return {
    scheduledTransactions: scheduledTransactions || [],
    isLoading,
    editTransaction,
    deleteScheduledTransaction,
    deleteRecurringSeries
  };
};
