import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus } from 'lucide-react';

interface SpecialUser {
  id: string;
  email: string;
  full_name: string;
  subscription_plan: {
    name: string;
    is_special: boolean;
  };
}

interface SpecialPlan {
  id: string;
  name: string;
  is_special: boolean;
}

export const SpecialUsersManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');

  // Buscar planos especiais
  const { data: specialPlans } = useQuery({
    queryKey: ['special-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, is_special')
        .eq('is_special', true)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as SpecialPlan[];
    }
  });

  // Buscar usuários com planos especiais
  const { data: specialUsers, isLoading } = useQuery({
    queryKey: ['special-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          user_id,
          subscription_plans!inner(name, is_special)
        `)
        .eq('subscription_plans.is_special', true)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Buscar dados dos usuários separadamente
      const userIds = data.map(sub => sub.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      return data.map(sub => {
        const profile = profiles.find(p => p.id === sub.user_id);
        return {
          id: sub.id,
          email: profile?.email || '',
          full_name: profile?.full_name || '',
          subscription_plan: sub.subscription_plans
        };
      }) as SpecialUser[];
    }
  });

  // Mutation para ativar usuário especial
  const activateSpecialUserMutation = useMutation({
    mutationFn: async ({ email, planId }: { email: string; planId: string }) => {
      // Buscar usuário pelo email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (profileError) throw new Error('Usuário não encontrado');
      
      // Desativar assinatura atual se existir
      await supabase
        .from('user_subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', profile.id)
        .eq('status', 'active');
      
      // Criar nova assinatura especial
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: profile.id,
          plan_id: planId,
          status: 'active',
          frequency: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 ano
        });
      
      if (subscriptionError) throw subscriptionError;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário ativado com plano especial!",
      });
      queryClient.invalidateQueries({ queryKey: ['special-users'] });
      setUserEmail('');
      setSelectedPlan('');
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao ativar usuário especial",
        variant: "destructive",
      });
    }
  });

  // Mutation para remover usuário especial
  const removeSpecialUserMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'canceled' })
        .eq('id', subscriptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário removido do plano especial!",
      });
      queryClient.invalidateQueries({ queryKey: ['special-users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao remover usuário especial",
        variant: "destructive",
      });
    }
  });

  const handleActivateUser = () => {
    if (!userEmail || !selectedPlan) {
      toast({
        title: "Erro",
        description: "Preencha o email e selecione um plano",
        variant: "destructive",
      });
      return;
    }

    activateSpecialUserMutation.mutate({ email: userEmail, planId: selectedPlan });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ativar Usuário Especial
          </CardTitle>
          <CardDescription>
            Ative usuários em planos especiais (Gratuito, Convidado, Parceria, Permuta)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="userEmail">Email do Usuário</Label>
            <Input
              id="userEmail"
              type="email"
              placeholder="usuario@exemplo.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="specialPlan">Plano Especial</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um plano especial" />
              </SelectTrigger>
              <SelectContent>
                {specialPlans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleActivateUser}
            disabled={activateSpecialUserMutation.isPending}
            className="w-full"
          >
            {activateSpecialUserMutation.isPending ? 'Ativando...' : 'Ativar Usuário'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários com Planos Especiais</CardTitle>
          <CardDescription>
            Lista de usuários ativos em planos especiais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : specialUsers?.length === 0 ? (
            <p className="text-muted-foreground">Nenhum usuário com plano especial encontrado</p>
          ) : (
            <div className="space-y-3">
              {specialUsers?.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{user.full_name || user.email}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <Badge variant="secondary" className="mt-1">
                      {user.subscription_plan.name}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSpecialUserMutation.mutate(user.id)}
                    disabled={removeSpecialUserMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};