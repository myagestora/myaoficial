import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';

interface UserFiltersProps {
  statusFilter: string;
  planFilter: string;
  roleFilter: string;
  onStatusFilterChange: (value: string) => void;
  onPlanFilterChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onClearFilters: () => void;
  availablePlans: { name: string; is_special: boolean }[];
}

export const UserFilters = ({
  statusFilter,
  planFilter,
  roleFilter,
  onStatusFilterChange,
  onPlanFilterChange,
  onRoleFilterChange,
  onClearFilters,
  availablePlans
}: UserFiltersProps) => {
  const hasActiveFilters = statusFilter !== 'all' || planFilter !== 'all' || roleFilter !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtros:</span>
      </div>
      
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="active">Ativo</SelectItem>
          <SelectItem value="inactive">Inativo</SelectItem>
          <SelectItem value="past_due">Em Atraso</SelectItem>
          <SelectItem value="canceled">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={planFilter} onValueChange={onPlanFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Plano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os planos</SelectItem>
          <SelectItem value="no_plan">Sem plano</SelectItem>
          <SelectItem value="special">Planos especiais</SelectItem>
          <SelectItem value="regular">Planos regulares</SelectItem>
          {availablePlans.map((plan) => (
            <SelectItem key={plan.name} value={plan.name}>
              {plan.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={roleFilter} onValueChange={onRoleFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="admin">Administradores</SelectItem>
          <SelectItem value="user">Usuários</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClearFilters}
          className="flex items-center gap-2"
        >
          <X className="h-3 w-3" />
          Limpar filtros
        </Button>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {statusFilter}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onStatusFilterChange('all')} 
              />
            </Badge>
          )}
          {planFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Plano: {planFilter}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onPlanFilterChange('all')} 
              />
            </Badge>
          )}
          {roleFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Tipo: {roleFilter}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onRoleFilterChange('all')} 
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};