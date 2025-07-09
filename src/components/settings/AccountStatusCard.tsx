
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserX, Loader2, AlertTriangle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AccountStatusCardProps {
  accountActive: boolean;
}

export const AccountStatusCard = ({ accountActive }: AccountStatusCardProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reactivateAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não encontrado');

      console.log('Reativando conta para usuário:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ account_status: 'active' })
        .eq('id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Erro ao reativar conta:', error);
        throw error;
      }

      console.log('Conta reativada com sucesso:', data);
      return data;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['account-status'] });
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

  const deactivateAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não encontrado');

      console.log('Iniciando desativação da conta para usuário:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ account_status: 'deactivated' })
        .eq('id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Erro ao desativar conta:', error);
        throw error;
      }

      console.log('Conta desativada com sucesso:', data);
      
      // Fazer logout do usuário
      await signOut();
    },
    onSuccess: () => {
      toast({
        title: "Conta desativada",
        description: "Sua conta foi desativada e você foi desconectado. Sua assinatura permanece ativa.",
      });
    },
    onError: (error: any) => {
      console.error('Erro na desativação:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível desativar a conta.",
        variant: "destructive",
      });
    }
  });

  const handleReactivateAccount = async () => {
    await reactivateAccountMutation.mutateAsync();
  };

  const handleDeactivateAccount = async () => {
    await deactivateAccountMutation.mutateAsync();
  };

  // Se a conta está ativa, mostrar opção para desativar
  if (accountActive) {
    return (
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Desativar Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ao desativar sua conta, você será desconectado e perderá acesso ao sistema até reativá-la. 
              Sua assinatura permanecerá ativa durante este período.
            </p>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={deactivateAccountMutation.isPending}
                className="w-full sm:w-auto"
              >
                {deactivateAccountMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desativando...
                  </>
                ) : (
                  'Desativar Conta'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmar Desativação da Conta
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Tem certeza de que deseja desativar sua conta?</p>
                  <p className="font-medium">Esta ação irá:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Desconectar você imediatamente</li>
                    <li>Bloquear seu acesso ao sistema</li>
                    <li>Manter sua assinatura ativa (não será cancelada)</li>
                    <li>Permitir reativação posterior caso queira voltar</li>
                  </ul>
                  <p className="text-blue-600 font-medium">
                    Você pode reativar sua conta a qualquer momento fazendo login novamente.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeactivateAccount}
                  disabled={deactivateAccountMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deactivateAccountMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Desativando...
                    </>
                  ) : (
                    'Sim, Desativar Conta'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  // Se a conta está desativada, mostrar opção para reativar
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
