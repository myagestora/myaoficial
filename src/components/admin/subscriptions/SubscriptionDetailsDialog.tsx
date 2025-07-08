
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SubscriptionWithProfile } from '@/types/subscription';

interface SubscriptionDetailsDialogProps {
  subscription: SubscriptionWithProfile | null;
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
                <label className="text-sm font-medium text-gray-500">Frequência</label>
                <p className="text-sm">
                  {subscription.frequency === 'monthly' ? 'Mensal' : 
                   subscription.frequency === 'yearly' ? 'Anual' : 
                   subscription.frequency || 'Não informado'}
                </p>
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
          {subscription.mercado_pago_subscription_id && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">IDs do Sistema</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mercado Pago Subscription ID</label>
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded">{subscription.mercado_pago_subscription_id}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
