
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { checkWhatsappExists } from '@/utils/whatsappValidation';

interface AddUserDialogProps {
  onUserAdded?: () => void;
}

export const AddUserDialog = ({ onUserAdded }: AddUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [validatingWhatsapp, setValidatingWhatsapp] = useState(false);
  const queryClient = useQueryClient();

  const { data: subscriptionPlans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const handleWhatsappChange = async (value: string) => {
    setWhatsapp(value || '');
    setWhatsappError('');
    
    // Validar se o valor não estiver vazio
    if (value && value.trim() !== '') {
      setValidatingWhatsapp(true);
      try {
        const exists = await checkWhatsappExists(value);
        if (exists) {
          setWhatsappError('Este número de WhatsApp já está sendo usado por outro usuário.');
        }
      } catch (error) {
        console.error('Erro ao validar WhatsApp:', error);
      } finally {
        setValidatingWhatsapp(false);
      }
    }
  };

  const addUserMutation = useMutation({
    mutationFn: async (userData: { 
      email: string; 
      password: string; 
      fullName: string; 
      whatsapp: string;
      subscriptionStatus: string;
      planId: string;
    }) => {
      console.log('🆕 Creating new user via edge function:', userData.email);
      
      // Get the current user's JWT token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Call edge function to create user (which has admin privileges)
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: userData.email,
          password: userData.password,
          fullName: userData.fullName,
          whatsapp: userData.whatsapp || null,
          subscriptionStatus: userData.subscriptionStatus,
          planId: userData.planId || null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('❌ Edge function invocation error:', error);
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data?.success) {
        console.error('❌ Function returned error:', data);
        throw new Error(data?.error || 'Erro ao criar usuário');
      }

      console.log('✅ User created successfully:', data);
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
      setSubscriptionStatus('inactive');
      setSelectedPlanId('');
      setWhatsappError('');
      onUserAdded?.();
    },
    onError: (error: any) => {
      console.error('❌ Add user error:', error);
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

    // Verificar se há erro de WhatsApp antes de submeter
    if (whatsappError) {
      toast({
        title: 'Erro',
        description: whatsappError,
        variant: 'destructive',
      });
      return;
    }

    addUserMutation.mutate({
      email,
      password,
      fullName,
      whatsapp,
      subscriptionStatus,
      planId: selectedPlanId
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
              onChange={handleWhatsappChange}
            />
            {validatingWhatsapp && (
              <p className="text-sm text-gray-500 mt-1">Verificando disponibilidade...</p>
            )}
            {whatsappError && (
              <p className="text-sm text-red-500 mt-1">{whatsappError}</p>
            )}
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

          {subscriptionStatus !== 'inactive' && subscriptionPlans && subscriptionPlans.length > 0 && (
            <div>
              <Label htmlFor="planId">Plano de Assinatura</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} {plan.is_special && '(Especial)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              disabled={addUserMutation.isPending || validatingWhatsapp || !!whatsappError}
            >
              {addUserMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
