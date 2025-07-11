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
      console.log('🆕 Creating new user with Supabase Admin API:', userData.email);
      
      // Step 1: Create user in auth.users using Supabase Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          full_name: userData.fullName,
          whatsapp: userData.whatsapp || null
        },
        email_confirm: true // Auto-confirm email for admin-created users
      });

      if (authError) {
        console.error('❌ Auth user creation error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Falha ao criar usuário na autenticação');
      }

      console.log('✅ Auth user created:', authData.user.id);

      // Step 2: Create profile using the new function
      const { data: profileData, error: profileError } = await supabase.rpc('admin_create_user_profile', {
        p_user_id: authData.user.id,
        p_email: userData.email,
        p_full_name: userData.fullName,
        p_whatsapp: userData.whatsapp || null,
        p_subscription_status: userData.subscriptionStatus,
        p_plan_id: userData.planId || null
      });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError);
        throw profileError;
      }

      if (!(profileData as any)?.success) {
        throw new Error((profileData as any)?.error || 'Erro ao criar perfil do usuário');
      }

      console.log('✅ User profile created successfully:', profileData);
      return profileData;
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
