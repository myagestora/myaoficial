
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EditUserDialogProps {
  user: any;
  onUserUpdated?: () => void;
}

export const EditUserDialog = ({ user, onUserUpdated }: EditUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user.email || '');
  const [fullName, setFullName] = useState(user.full_name || '');
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || '');
  const [subscriptionStatus, setSubscriptionStatus] = useState(user.subscription_status || 'inactive');
  const [adminOverride, setAdminOverride] = useState(user.admin_override_status || false);
  const [isAdmin, setIsAdmin] = useState(
    user.user_roles?.some((role: any) => role.role === 'admin') || false
  );
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: async (userData: { 
      email: string; 
      fullName: string; 
      whatsapp: string; 
      subscriptionStatus: string;
      adminOverride: boolean;
      isAdmin: boolean;
    }) => {
      console.log('🔄 Updating user with data:', userData);
      console.log('👤 User ID:', user.id);
      console.log('📊 Current user data before update:', user);
      
      // Atualizar perfil
      const updateData = {
        email: userData.email,
        full_name: userData.fullName,
        whatsapp: userData.whatsapp,
        subscription_status: userData.subscriptionStatus,
        admin_override_status: userData.adminOverride,
      };
      
      console.log('📝 Data to update in profiles table:', updateData);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select();

      console.log('✅ Profile update result:', { profileData, profileError });

      if (profileError) {
        console.error('❌ Profile update error:', profileError);
        throw profileError;
      }

      // Verificar se a atualização realmente aconteceu
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('🔍 Verification after update:', { verifyData, verifyError });

      if (verifyError) {
        console.error('❌ Verification error:', verifyError);
      }

      // Comparar dados antes e depois
      console.log('📊 Status comparison:');
      console.log('   Before:', user.subscription_status);
      console.log('   Wanted:', userData.subscriptionStatus);
      console.log('   After: ', verifyData?.subscription_status);
      console.log('   Admin override before:', user.admin_override_status);
      console.log('   Admin override wanted:', userData.adminOverride);
      console.log('   Admin override after: ', verifyData?.admin_override_status);

      // Gerenciar role de admin
      const currentlyAdmin = user.user_roles?.some((role: any) => role.role === 'admin') || false;
      
      console.log('🔐 Admin role management:');
      console.log('   Currently admin:', currentlyAdmin);
      console.log('   Should be admin:', userData.isAdmin);
      
      if (userData.isAdmin && !currentlyAdmin) {
        console.log('➕ Adding admin role');
        // Adicionar role de admin
        const { error: addRoleError } = await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'admin' });
        
        if (addRoleError) {
          console.error('❌ Add role error:', addRoleError);
          throw addRoleError;
        }
      } else if (!userData.isAdmin && currentlyAdmin) {
        console.log('➖ Removing admin role');
        // Remover role de admin
        const { error: removeRoleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        if (removeRoleError) {
          console.error('❌ Remove role error:', removeRoleError);
          throw removeRoleError;
        }
      }

      return verifyData;
    },
    onSuccess: (verifyData) => {
      console.log('🎉 Update successful, final data:', verifyData);
      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setOpen(false);
      onUserUpdated?.();
    },
    onError: (error: any) => {
      console.error('❌ Update user error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar usuário',
        variant: 'destructive',
      });
    }
  });

  const handleSubscriptionStatusChange = (value: string) => {
    console.log('🔄 Changing subscription status to:', value);
    setSubscriptionStatus(value);
    // Automaticamente marcar o admin override quando o status for alterado
    setAdminOverride(true);
    console.log('✅ Admin override set to true');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    console.log('📤 Submitting form with:', {
      email,
      fullName,
      whatsapp,
      subscriptionStatus,
      adminOverride,
      isAdmin
    });

    updateUserMutation.mutate({
      email,
      fullName,
      whatsapp,
      subscriptionStatus,
      adminOverride,
      isAdmin
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Editar Usuário">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nome Completo *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite o email"
              required
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <PhoneInput
              id="whatsapp"
              value={whatsapp}
              onChange={(value) => setWhatsapp(value || '')}
            />
          </div>

          <div>
            <Label htmlFor="subscriptionStatus">Status da Assinatura</Label>
            <Select value={subscriptionStatus} onValueChange={handleSubscriptionStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
                <SelectItem value="past_due">Em Atraso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="adminOverride"
              checked={adminOverride}
              onCheckedChange={(checked) => setAdminOverride(checked as boolean)}
            />
            <Label htmlFor="adminOverride" className="text-sm">
              Forçar status manualmente (ignorar sincronização com assinatura)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAdmin"
              checked={isAdmin}
              onCheckedChange={(checked) => setIsAdmin(checked as boolean)}
            />
            <Label htmlFor="isAdmin" className="text-sm font-medium">
              Permissões de Administrador
            </Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
