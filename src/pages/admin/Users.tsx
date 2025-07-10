
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Shield, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { UserFilters } from '@/components/admin/UserFilters';

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchTerm, statusFilter, planFilter, roleFilter],
    queryFn: async () => {
      console.log('🔍 Fetching users with search term:', searchTerm);
      
      // Buscar perfis
      let profileQuery = supabase
        .from('profiles')
        .select('*');

      if (searchTerm) {
        profileQuery = profileQuery.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: profiles, error: profileError } = await profileQuery.order('created_at', { ascending: false });
      
      if (profileError) {
        console.error('❌ Error fetching profiles:', profileError);
        throw profileError;
      }

      console.log('📋 Profiles fetched:', profiles);

      // Buscar roles para cada usuário
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) {
        console.error('❌ Error fetching roles:', rolesError);
        throw rolesError;
      }

      console.log('🔐 User roles fetched:', userRoles);

      // Buscar assinaturas ativas dos usuários
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          status,
          subscription_plans (
            name,
            is_special
          )
        `)
        .eq('status', 'active');

      if (subscriptionsError) {
        console.error('❌ Error fetching subscriptions:', subscriptionsError);
      }

      console.log('📄 User subscriptions fetched:', subscriptions);

      // Combinar os dados
      const usersWithRolesAndPlans = profiles?.map(profile => {
        const userSubscription = subscriptions?.find(sub => sub.user_id === profile.id);
        return {
          ...profile,
          user_roles: userRoles?.filter(role => role.user_id === profile.id) || [],
          current_plan: userSubscription?.subscription_plans || null,
          is_special_plan: userSubscription?.subscription_plans?.is_special || false
        };
      }) || [];

      console.log('👥 Final users with roles and plans:', usersWithRolesAndPlans);

      return usersWithRolesAndPlans;
    }
  });

  const getUserRole = (user: any) => {
    return user.user_roles?.some((role: any) => role.role === 'admin') ? 'admin' : 'user';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'canceled':
        return 'Cancelado';
      case 'past_due':
        return 'Em Atraso';
      default:
        return 'Inativo';
    }
  };

  // Filtrar usuários com base nos filtros aplicados
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter((user) => {
      // Filtro por status
      if (statusFilter !== 'all' && user.subscription_status !== statusFilter) {
        return false;
      }

      // Filtro por plano
      if (planFilter !== 'all') {
        if (planFilter === 'no_plan' && user.current_plan) {
          return false;
        }
        if (planFilter === 'special' && !user.is_special_plan) {
          return false;
        }
        if (planFilter === 'regular' && (user.is_special_plan || !user.current_plan)) {
          return false;
        }
        if (planFilter !== 'no_plan' && planFilter !== 'special' && planFilter !== 'regular') {
          if (!user.current_plan || user.current_plan.name !== planFilter) {
            return false;
          }
        }
      }

      // Filtro por tipo (admin/user)
      if (roleFilter !== 'all' && getUserRole(user) !== roleFilter) {
        return false;
      }

      return true;
    });
  }, [users, statusFilter, planFilter, roleFilter]);

  // Obter planos únicos para o filtro
  const availablePlans = useMemo(() => {
    if (!users) return [];
    
    const plansSet = new Set();
    const plans: { name: string; is_special: boolean }[] = [];
    
    users.forEach(user => {
      if (user.current_plan && !plansSet.has(user.current_plan.name)) {
        plansSet.add(user.current_plan.name);
        plans.push({
          name: user.current_plan.name,
          is_special: user.is_special_plan
        });
      }
    });
    
    return plans.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setPlanFilter('all');
    setRoleFilter('all');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Usuários</h1>
          <p className="text-gray-600 dark:text-gray-400">Administre todos os usuários do sistema</p>
        </div>
        <AddUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <UserFilters
              statusFilter={statusFilter}
              planFilter={planFilter}
              roleFilter={roleFilter}
              onStatusFilterChange={setStatusFilter}
              onPlanFilterChange={setPlanFilter}
              onRoleFilterChange={setRoleFilter}
              onClearFilters={handleClearFilters}
              availablePlans={availablePlans}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando usuários...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status da Assinatura</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getUserRole(user) === 'admin' && (
                          <Shield className="h-4 w-4 text-blue-600" />
                        )}
                        <div>
                          <p className="font-medium">{user.full_name || 'Nome não informado'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.current_plan ? (
                        <Badge 
                          variant={user.is_special_plan ? 'outline' : 'default'}
                          className={user.is_special_plan ? 'border-amber-500 text-amber-700' : ''}
                        >
                          {user.is_special_plan && <Crown className="h-3 w-3 mr-1" />}
                          {user.current_plan.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Sem plano</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          user.subscription_status === 'active' 
                            ? 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400'
                            : user.subscription_status === 'past_due'
                            ? 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400'
                            : user.subscription_status === 'canceled'
                            ? 'border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-400'
                            : 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-400'
                        }
                      >
                        {getStatusLabel(user.subscription_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.whatsapp || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <EditUserDialog user={user} />
                        <DeleteUserDialog user={user} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
