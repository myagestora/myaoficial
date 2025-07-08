
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

interface DeleteUserDialogProps {
  user: any;
  onUserDeleted?: () => void;
}

export const DeleteUserDialog = ({ user, onUserDeleted }: DeleteUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log('🗑️ Starting user deletion for ID:', userId);

      // Primeiro tentar deletar do Supabase Auth
      console.log('🗑️ Attempting to delete from auth.users');
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('❌ Auth deletion error (will continue with profile deletion):', authError);
        // Não vamos interromper se falhar no auth, continuamos com o profile
      } else {
        console.log('✅ User deleted from auth successfully');
      }

      // Depois remover assinaturas do usuário
      console.log('🗑️ Removing user subscriptions');
      const { error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (subscriptionsError) {
        console.error('❌ Error deleting user subscriptions:', subscriptionsError);
        throw subscriptionsError;
      }

      // Depois remover roles do usuário
      console.log('🗑️ Removing user roles');
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) {
        console.error('❌ Error deleting user roles:', rolesError);
        throw rolesError;
      }

      // Por fim remover o perfil
      console.log('🗑️ Removing user profile');
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Error deleting profile:', profileError);
        throw profileError;
      }

      console.log('✅ User deleted successfully');
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Usuário removido com sucesso',
      });
      // Invalidar múltiples queries para garantir atualização
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.refetchQueries({ queryKey: ['admin-users'] });
      setOpen(false);
      onUserDeleted?.();
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
    deleteUserMutation.mutate(user.id);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Remover Usuário">
          <Trash className="h-4 w-4 text-red-500" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover o usuário <strong>{user.full_name || user.email}</strong>?
            Esta ação não pode ser desfeita e removerá todas as assinaturas e dados relacionados.
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
