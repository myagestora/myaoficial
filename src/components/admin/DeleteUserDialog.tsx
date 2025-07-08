
import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface DeleteUserDialogProps {
  user: any;
  onUserDeleted?: () => void;
}

export const DeleteUserDialog = ({ user, onUserDeleted }: DeleteUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Verificar se o usuário atual está tentando apagar a si mesmo
  const isSelfDeletion = currentUser?.id === user.id;

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log('🗑️ Starting user deletion for ID:', userId);

      // Remover assinaturas do usuário primeiro
      console.log('🗑️ Removing user subscriptions');
      const { error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (subscriptionsError) {
        console.error('❌ Error deleting user subscriptions:', subscriptionsError);
        throw subscriptionsError;
      }

      // Remover roles do usuário
      console.log('🗑️ Removing user roles');
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.error('❌ Error deleting user roles:', rolesError);
        throw rolesError;
      }

      // Por fim remover o perfil (isso deve desativar o usuário)
      console.log('🗑️ Removing user profile');
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Error deleting profile:', profileError);
        throw profileError;
      }

      console.log('✅ User data deleted successfully from public tables');
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Usuário removido com sucesso',
      });
      
      // Forçar atualização da lista
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.refetchQueries({ queryKey: ['admin-users'] });
      
      setOpen(false);
      onUserDeleted?.();
      
      // Recarregar a página como fallback para garantir que a lista seja atualizada
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error: any) => {
      console.error('❌ Delete user error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover usuário',
        variant: 'destructive',
      });
    }
  });

  const handleDelete = () => {
    if (isSelfDeletion) {
      toast({
        title: 'Erro',
        description: 'Você não pode remover seu próprio usuário',
        variant: 'destructive',
      });
      return;
    }
    deleteUserMutation.mutate(user.id);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          title="Remover Usuário"
          disabled={isSelfDeletion}
        >
          <Trash className={`h-4 w-4 ${isSelfDeletion ? 'text-gray-400' : 'text-red-500'}`} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover o usuário <strong>{user.full_name || user.email}</strong>?
            Esta ação removerá todos os dados do usuário das tabelas públicas. 
            O usuário não conseguirá mais fazer login, mas pode precisar ser removido manualmente do Supabase Auth.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteUserMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteUserMutation.isPending ? 'Removendo...' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
