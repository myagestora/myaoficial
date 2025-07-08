
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface SubscriptionData {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_plans: {
    name: string;
    description: string | null;
    price_monthly: number | null;
    price_yearly: number | null;
  } | null;
  profiles: ProfileData | null;
}

interface EditSubscriptionDialogProps {
  subscription: SubscriptionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditSubscriptionDialog = ({ subscription, open, onOpenChange }: EditSubscriptionDialogProps) => {
  const [status, setStatus] = useState(subscription?.status || 'inactive');
  const [planId, setPlanId] = useState(subscription?.plan_id || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans } = useQuery({
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

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('id', subscription?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Assinatura atualizada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar assinatura: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (!subscription) return;
    
    updateMutation.mutate({
      status,
      plan_id: planId,
      updated_at: new Date().toISOString()
    });
  };

  React.useEffect(() => {
    if (subscription) {
      setStatus(subscription.status || 'inactive');
      setPlanId(subscription.plan_id || '');
    }
  }, [subscription]);

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Assinatura</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="client">Cliente</Label>
            <p className="text-sm text-gray-600 mt-1">
              {subscription.profiles?.full_name || 'Nome não informado'} ({subscription.profiles?.email})
            </p>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
                <SelectItem value="past_due">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="plan">Plano</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
