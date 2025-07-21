import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  bank_name?: string;
  last_four_digits?: string;
  credit_limit?: number;
  current_balance: number;
  due_date?: number;
  is_default: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCreditCardData {
  name: string;
  bank_name?: string;
  last_four_digits?: string;
  credit_limit?: number;
  due_date?: number;
  is_default?: boolean;
  color?: string;
}

export const useCreditCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: creditCards = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['creditCards'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!user,
  });

  const createCreditCard = useMutation({
    mutationFn: async (cardData: CreateCreditCardData) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('credit_cards')
        .insert([
          {
            ...cardData,
            user_id: user.id,
            current_balance: 0,
            color: cardData.color || '#EF4444',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      toast({
        title: 'Sucesso',
        description: 'Cartão de crédito criado com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao criar cartão de crédito: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const updateCreditCard = useMutation({
    mutationFn: async ({ id, ...cardData }: Partial<CreditCard> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('credit_cards')
        .update(cardData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      toast({
        title: 'Sucesso',
        description: 'Cartão de crédito atualizado com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar cartão de crédito: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCreditCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('credit_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards'] });
      toast({
        title: 'Sucesso',
        description: 'Cartão de crédito excluído com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir cartão de crédito: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const defaultCard = creditCards.find(card => card.is_default);

  return {
    creditCards,
    defaultCard,
    isLoading,
    error,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
  };
};