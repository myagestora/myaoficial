
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AdminSubscriptions = () => {
  const { data: subscriptions } = useQuery({
    queryKey: ['user-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            name
          ),
          profiles!user_subscriptions_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        // Se o join não funcionar, fazemos duas queries separadas
        console.log('Join failed, trying separate queries:', error);
        
        const { data: subscriptionsData, error: subsError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans (
              name
            )
          `)
          .order('created_at', { ascending: false });
        
        if (subsError) throw subsError;
        
        // Buscar perfis dos usuários
        const userIds = subscriptionsData?.map(sub => sub.user_id) || [];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (profilesError) throw profilesError;
        
        // Combinar os dados manualmente
        const combinedData = subscriptionsData?.map(subscription => ({
          ...subscription,
          profiles: profilesData?.find(profile => profile.id === subscription.user_id)
        }));
        
        return combinedData;
      }
      
      return data;
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assinaturas dos Clientes</h1>
        <p className="text-gray-600 dark:text-gray-400">Gerencie as assinaturas ativas dos usuários</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assinaturas Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Renovação</TableHead>
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
                  <TableCell>{subscription.subscription_plans?.name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={subscription.status === 'active' ? 'default' : 'secondary'}
                    >
                      {subscription.status === 'active' ? 'Ativo' : 'Inativo'}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscriptions;
