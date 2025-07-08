
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: async (userData: { email: string; fullName: string; whatsapp: string; subscriptionStatus: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          email: userData.email,
          full_name: userData.fullName,
          whatsapp: userData.whatsapp,
          subscription_status: userData.subscriptionStatus,
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setOpen(false);
      onUserUpdated?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar usuário',
        variant: 'destructive',
      });
    }
  });

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

    updateUserMutation.mutate({
      email,
      fullName,
      whatsapp,
      subscriptionStatus
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
            <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
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
