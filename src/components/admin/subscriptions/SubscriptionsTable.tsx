
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionWithProfile } from '@/types/subscription';
import { SubscriptionActionsDropdown } from './SubscriptionActionsDropdown';

interface SubscriptionsTableProps {
  subscriptions: SubscriptionWithProfile[];
  isLoading: boolean;
  onView: (subscription: SubscriptionWithProfile) => void;
  onEdit: (subscription: SubscriptionWithProfile) => void;
  onCancel: (subscription: SubscriptionWithProfile) => void;
  onReactivate: (subscription: SubscriptionWithProfile) => void;
  searchTerm: string;
}

export const SubscriptionsTable = ({
  subscriptions,
  isLoading,
  onView,
  onEdit,
  onCancel,
  onReactivate,
  searchTerm
}: SubscriptionsTableProps) => {
  // Buscar cor primária personalizada
  const { data: primaryColor } = useQuery({
    queryKey: ['system-config-primary-color'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'primary_color')
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching primary color:', error);
          return '#3B82F6'; // cor padrão
        }

        const colorValue = data?.value;
        if (typeof colorValue === 'string') {
          return colorValue.replace(/^"|"$/g, '');
        }
        return '#3B82F6';
      } catch (error) {
        console.error('Error fetching primary color:', error);
        return '#3B82F6';
      }
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'canceled':
        return 'destructive';
      case 'past_due':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'canceled':
        return 'Cancelado';
      case 'past_due':
        return 'Vencido';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Carregando assinaturas...</div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Início</TableHead>
          <TableHead>Renovação</TableHead>
          <TableHead className="w-[50px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subscriptions?.map((subscription) => (
          <TableRow key={subscription.id}>
            <TableCell>
              {subscription.profiles?.full_name || 'Nome não informado'}
            </TableCell>
            <TableCell>
              {subscription.profiles?.email || 'Email não informado'}
            </TableCell>
            <TableCell>
              {subscription.subscription_plans ? (
                <Badge 
                  variant={subscription.subscription_plans.is_special ? 'outline' : 'default'}
                  className={subscription.subscription_plans.is_special ? 'border-amber-500 text-amber-700' : ''}
                  style={!subscription.subscription_plans.is_special && primaryColor ? { 
                    backgroundColor: primaryColor, 
                    color: 'white',
                    borderColor: primaryColor
                  } : {}}
                >
                  {subscription.subscription_plans.is_special && <Crown className="h-3 w-3 mr-1" />}
                  {subscription.subscription_plans.name}
                </Badge>
              ) : (
                '-'
              )}
            </TableCell>
            <TableCell>
              <Badge 
                variant={getStatusBadgeVariant(subscription.status)}
                className={subscription.status === 'active' ? '' : ''}
                style={subscription.status === 'active' && primaryColor ? { 
                  backgroundColor: primaryColor, 
                  color: 'white',
                  borderColor: primaryColor
                } : {}}
              >
                {getStatusText(subscription.status)}
              </Badge>
            </TableCell>
            <TableCell>
              {subscription.current_period_start 
                ? new Date(subscription.current_period_start).toLocaleDateString('pt-BR')
                : '-'
              }
            </TableCell>
            <TableCell>
              {subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                : '-'
              }
            </TableCell>
            <TableCell>
              <SubscriptionActionsDropdown
                subscription={subscription}
                onView={onView}
                onEdit={onEdit}
                onCancel={onCancel}
                onReactivate={onReactivate}
              />
            </TableCell>
          </TableRow>
        ))}
        {!subscriptions?.length && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nenhuma assinatura encontrada para sua pesquisa.' : 'Nenhuma assinatura encontrada.'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
