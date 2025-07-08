
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

interface SubscriptionDetailsDialogProps {
  subscription: SubscriptionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionDetailsDialog = ({ subscription, open, onOpenChange }: SubscriptionDetailsDialogProps) => {
  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Assinatura</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Cliente */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Informações do Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Nome</label>
                <p className="text-sm">{subscription.profiles?.full_name || 'Nome não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm">{subscription.profiles?.email || 'Email não informado'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações da Assinatura */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Detalhes da Assinatura</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Plano</label>
                <p className="text-sm">{subscription.subscription_plans?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                  {subscription.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Data de Início</label>
                <p className="text-sm">
                  {subscription.current_period_start 
                    ? new Date(subscription.current_period_start).toLocaleDateString('pt-BR')
                    : '-'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Próxima Renovação</label>
                <p className="text-sm">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                    : '-'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                <p className="text-sm">
                  {subscription.created_at
                    ? new Date(subscription.created_at).toLocaleDateString('pt-BR')
                    : '-'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Última Atualização</label>
                <p className="text-sm">
                  {subscription.updated_at
                    ? new Date(subscription.updated_at).toLocaleDateString('pt-BR')
                    : '-'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* IDs do Sistema */}
          {(subscription.stripe_customer_id || subscription.stripe_subscription_id) && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">IDs do Sistema</h3>
                <div className="grid grid-cols-1 gap-4">
                  {subscription.stripe_customer_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Stripe Customer ID</label>
                      <p className="text-xs font-mono bg-gray-100 p-2 rounded">{subscription.stripe_customer_id}</p>
                    </div>
                  )}
                  {subscription.stripe_subscription_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Stripe Subscription ID</label>
                      <p className="text-xs font-mono bg-gray-100 p-2 rounded">{subscription.stripe_subscription_id}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
