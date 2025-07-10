import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { getUserRole, getStatusLabel, getStatusClassName } from '@/utils/userUtils';

interface UsersTableProps {
  users: any[];
  isLoading: boolean;
}

export const UsersTable = ({ users, isLoading }: UsersTableProps) => {
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

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Carregando usuários...</p>
      </div>
    );
  }

  return (
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
        {users?.map((user) => (
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
                  style={!user.is_special_plan && primaryColor ? { 
                    backgroundColor: primaryColor, 
                    color: 'white',
                    borderColor: primaryColor
                  } : {}}
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
                className={getStatusClassName(user.subscription_status)}
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
  );
};