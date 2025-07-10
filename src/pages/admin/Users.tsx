
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { UserFilters } from '@/components/admin/UserFilters';
import { UsersTable } from '@/components/admin/UsersTable';
import { useAdminUsers } from '@/hooks/useAdminUsers';

const AdminUsers = () => {
  const {
    users,
    isLoading,
    availablePlans,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    planFilter,
    setPlanFilter,
    roleFilter,
    setRoleFilter,
    handleClearFilters,
  } = useAdminUsers();

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
          <UsersTable users={users} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
