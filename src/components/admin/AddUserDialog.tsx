
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { UserPlus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AddUserDialogProps {
  onUserAdded?: () => void;
}

export const AddUserDialog = ({ onUserAdded }: AddUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const queryClient = useQueryClient();

  const addUserMutation = useMutation({
    mutationFn: async (userData: { email: string; password: string; fullName: string; whatsapp: string }) => {
      // Create user via Supabase Admin API (this would typically be done on the backend)
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            whatsapp: userData.whatsapp,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      // Since we can't directly insert into auth.users, we'll create a profile record
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: userData.email,
            full_name: userData.fullName,
            whatsapp: userData.whatsapp,
          });

        if (profileError) throw profileError;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Usuário adicionado com sucesso',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setOpen(false);
      setEmail('');
      setFullName('');
      setWhatsapp('');
      setPassword('');
      onUserAdded?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar usuário',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    addUserMutation.mutate({
      email,
      password,
      fullName,
      whatsapp
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
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
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              required
              minLength={6}
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
              disabled={addUserMutation.isPending}
            >
              {addUserMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
