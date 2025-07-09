
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserX, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface AccountStatusCardProps {
  accountActive: boolean;
}

export const AccountStatusCard = ({ accountActive }: AccountStatusCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reactivateAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não encontrado');

      console.log('Reativando conta para usuário:', user.id);
      
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'active' })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao reativar conta:', error);
        throw error;
      }

      console.log('Conta reativada com sucesso');
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas ao usuário
      queryClient.invalidateQueries({ queryKey: ['user-access-check'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: "Conta reativada",
        description: "Sua conta foi reativada com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error('Erro na reativação:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível reativar a conta.",
        variant: "destructive",
      });
    }
  });

  const handleReactivateAccount = async () => {
    await reactivateAccountMutation.mutateAsync();
  };

  if (accountActive) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <UserX className="h-5 w-5" />
          Conta Desativada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-orange-700 dark:text-orange-300">
          Sua conta foi desativada, mas sua assinatura permanece ativa. 
          Você pode reativar sua conta a qualquer momento.
        </p>
        <Button 
          onClick={handleReactivateAccount}
          disabled={reactivateAccountMutation.isPending}
          className="w-full sm:w-auto"
        >
          {reactivateAccountMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reativando...
            </>
          ) : (
            'Reativar Minha Conta'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
