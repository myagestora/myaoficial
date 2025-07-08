import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Filter } from 'lucide-react';
import { SubscriptionDetailsDialog } from '@/components/admin/subscriptions/SubscriptionDetailsDialog';
import { EditSubscriptionDialog } from '@/components/admin/subscriptions/EditSubscriptionDialog';
import { SubscriptionActionsDropdown } from '@/components/admin/subscriptions/SubscriptionActionsDropdown';

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface SubscriptionWithProfile {
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

const AdminSubscriptions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithProfile | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['user-subscriptions'],
    queryFn: async (): Promise<SubscriptionWithProfile[]> => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            description,
            price_monthly,
            price_yearly
          ),
          profiles!user_subscriptions_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.log('Join failed, trying separate queries:', error);
        
        const { data: subscriptionsData, error: subsError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans (
              name,
              description,
              price_monthly,
              price_yearly
            )
          `)
          .order('created_at', { ascending: false });
        
        if (subsError) throw subsError;
        
        const userIds = subscriptionsData?.map(sub => sub.user_id) || [];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (profilesError) throw profilesError;
        
        const combinedData: SubscriptionWithProfile[] = subscriptionsData?.map(subscription => ({
          id: subscription.id,
          user_id: subscription.user_id,
          plan_id: subscription.plan_id,
          status: subscription.status || 'inactive',
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          created_at: subscription.created_at || '',
          updated_at: subscription.updated_at || '',
          stripe_customer_id: subscription.stripe_customer_id,
          stripe_subscription_id: subscription.stripe_subscription_id,
          subscription_plans: subscription.subscription_plans,
          profiles: profilesData?.find(profile => profile.id === subscription.user_id) || null
        })) || [];
        
        return combinedData;
      }
      
      const transformedData: SubscriptionWithProfile[] = data?.map(subscription => {
        // First check if profiles exists and is a valid object
        const profilesData = subscription.profiles;
        let validProfile: ProfileData | null = null;
        
        if (profilesData && typeof profilesData === 'object') {
          // Check if it's not an error object and has the required properties
          if (!('error' in profilesData) && 
              'id' in profilesData && 
              'full_name' in profilesData && 
              'email' in profilesData) {
            validProfile = profilesData as ProfileData;
          }
        }
        
        return {
          id: subscription.id,
          user_id: subscription.user_id,
          plan_id: subscription.plan_id,
          status: subscription.status || 'inactive',
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          created_at: subscription.created_at || '',
          updated_at: subscription.updated_at || '',
          stripe_customer_id: subscription.stripe_customer_id,
          stripe_subscription_id: subscription.stripe_subscription_id,
          subscription_plans: subscription.subscription_plans,
          profiles: validProfile
        };
      }) || [];
      
      return transformedData;
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Assinatura cancelada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao cancelar assinatura: " + error.message,
        variant: "destructive",
      });
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Assinatura reativada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao reativar assinatura: " + error.message,
        variant: "destructive",
      });
    }
  });

  const filteredSubscriptions = subscriptions?.filter(subscription => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      subscription.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      subscription.profiles?.email?.toLowerCase().includes(searchLower) ||
      subscription.subscription_plans?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleView = (subscription: SubscriptionWithProfile) => {
    setSelectedSubscription(subscription);
    setDetailsOpen(true);
  };

  const handleEdit = (subscription: SubscriptionWithProfile) => {
    setSelectedSubscription(subscription);
    setEditOpen(true);
  };

  const handleCancel = (subscription: SubscriptionWithProfile) => {
    if (confirm('Tem certeza que deseja cancelar esta assinatura?')) {
      cancelMutation.mutate(subscription.id);
    }
  };

  const handleReactivate = (subscription: SubscriptionWithProfile) => {
    if (confirm('Tem certeza que deseja reativar esta assinatura?')) {
      reactivateMutation.mutate(subscription.id);
    }
  };

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assinaturas dos Clientes</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie as assinaturas ativas dos usuários</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Assinaturas ({filteredSubscriptions?.length || 0})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, email ou plano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Carregando assinaturas...</div>
            </div>
          ) : (
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
                {filteredSubscriptions?.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      {subscription.profiles?.full_name || 'Nome não informado'}
                    </TableCell>
                    <TableCell>
                      {subscription.profiles?.email || 'Email não informado'}
                    </TableCell>
                    <TableCell>{subscription.subscription_plans?.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(subscription.status)}>
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
                        onView={handleView}
                        onEdit={handleEdit}
                        onCancel={handleCancel}
                        onReactivate={handleReactivate}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredSubscriptions?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'Nenhuma assinatura encontrada para sua pesquisa.' : 'Nenhuma assinatura encontrada.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SubscriptionDetailsDialog
        subscription={selectedSubscription}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <EditSubscriptionDialog
        subscription={selectedSubscription}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
};

export default AdminSubscriptions;
