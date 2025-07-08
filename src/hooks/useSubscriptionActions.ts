
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSubscriptionActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Assinatura cancelada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao cancelar assinatura: " + error.message,
        variant: "destructive",
      });
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Assinatura reativada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao reativar assinatura: " + error.message,
        variant: "destructive",
      });
    }
  });

  return {
    cancelSubscription: cancelMutation.mutate,
    reactivateSubscription: reactivateMutation.mutate,
  };
};
