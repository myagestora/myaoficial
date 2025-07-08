
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const DeactivateAccountSection = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [isDeactivating, setIsDeactivating] = useState(false);

  const deactivateAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não encontrado');

      console.log('Iniciando desativação da conta para usuário:', user.id);
      
      // Apenas desativar a conta sem cancelar assinatura
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          account_status: 'deactivated'
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Erro ao desativar conta:', updateError);
        throw updateError;
      }

      console.log('Conta desativada com sucesso - assinatura mantida');
      
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
    },
    onSettled: () => {
      setIsDeactivating(false);
    }
  });

  const handleDeactivateAccount = async () => {
    setIsDeactivating(true);
    await deactivateAccountMutation.mutateAsync();
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Zona de Perigo
        </CardTitle>
        <CardDescription>
          Ações relacionadas à sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-destructive">Desativar Conta</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Ao desativar sua conta, você será desconectado e perderá acesso ao sistema até reativá-la. 
              Sua assinatura permanecerá ativa durante este período.
            </p>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isDeactivating}
                className="w-full sm:w-auto"
              >
                {isDeactivating ? (
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
                  disabled={isDeactivating}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeactivating ? (
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
        </div>
      </CardContent>
    </Card>
  );
};
