
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchTerm],
    queryFn: async () => {
      // Buscar perfis
      let profileQuery = supabase
        .from('profiles')
        .select('*');

      if (searchTerm) {
        profileQuery = profileQuery.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: profiles, error: profileError } = await profileQuery.order('created_at', { ascending: false });
      
      if (profileError) throw profileError;

      // Buscar roles para cada usuário
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Combinar os dados
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        user_roles: userRoles?.filter(role => role.user_id === profile.id) || []
      })) || [];

      return usersWithRoles;
    }
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isCurrentlyAdmin }: { userId: string; isCurrentlyAdmin: boolean }) => {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Sucesso',
        description: 'Permissões de usuário atualizadas',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar permissões',
        variant: 'destructive',
      });
    }
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: newStatus })
        .eq('id', userId);
      
      if (error) throw error;
      return { userId, newStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Sucesso',
        description: `Usuário ${data.newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status do usuário',
        variant: 'destructive',
      });
    }
  });

  const getUserRole = (user: any) => {
    return user.user_roles?.some((role: any) => role.role === 'admin') ? 'admin' : 'user';
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'outline';
      case 'canceled':
        return 'destructive';
      case 'past_due':
        return 'secondary';
      default:
        return 'outline';
    }
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
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => {
                  const isAdmin = getUserRole(user) === 'admin';
                  const status = user.subscription_status || 'inactive';
                  const isActive = status === 'active';
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Nome não informado'}
                      </TableCell>
                      <TableCell>{user.email || 'Email não informado'}</TableCell>
                      <TableCell>
                        <Badge variant={isAdmin ? 'destructive' : 'secondary'}>
                          {isAdmin ? 'Admin' : 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(status)}>
                          {getStatusLabel(status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <EditUserDialog user={user} />
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAdminMutation.mutate({
                              userId: user.id,
                              isCurrentlyAdmin: isAdmin
                            })}
                            title={isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                          >
                            {isAdmin ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserStatusMutation.mutate({
                              userId: user.id,
                              currentStatus: status
                            })}
                            title={isActive ? 'Desativar Usuário' : 'Ativar Usuário'}
                          >
                            {isActive ? (
                              <UserX className="h-4 w-4 text-red-600" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
