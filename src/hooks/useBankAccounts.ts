import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  bank_name?: string;
  account_number?: string;
  balance: number;
  is_default: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountData {
  name: string;
  type: 'checking' | 'savings' | 'investment';
  bank_name?: string;
  account_number?: string;
  balance?: number;
  is_default?: boolean;
  color?: string;
}

export const useBankAccounts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: bankAccounts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!user,
  });

  const createBankAccount = useMutation({
    mutationFn: async (accountData: CreateBankAccountData) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('bank_accounts')
        .insert([
          {
            ...accountData,
            user_id: user.id,
            balance: accountData.balance || 0,
            color: accountData.color || '#3B82F6',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      toast({
        title: 'Sucesso',
        description: 'Conta bancária criada com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao criar conta bancária: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const updateBankAccount = useMutation({
    mutationFn: async ({ id, ...accountData }: Partial<BankAccount> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('bank_accounts')
        .update(accountData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      toast({
        title: 'Sucesso',
        description: 'Conta bancária atualizada com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar conta bancária: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      toast({
        title: 'Sucesso',
        description: 'Conta bancária excluída com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir conta bancária: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const defaultAccount = bankAccounts.find(account => account.is_default);

  return {
    bankAccounts,
    defaultAccount,
    isLoading,
    error,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
  };
};