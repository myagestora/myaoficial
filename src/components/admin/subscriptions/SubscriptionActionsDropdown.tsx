
import React from 'react';
import { MoreHorizontal, Eye, Edit, Trash2, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SubscriptionWithProfile } from '@/types/subscription';

interface SubscriptionActionsDropdownProps {
  subscription: SubscriptionWithProfile;
  onView: (subscription: SubscriptionWithProfile) => void;
  onEdit: (subscription: SubscriptionWithProfile) => void;
  onCancel: (subscription: SubscriptionWithProfile) => void;
  onReactivate: (subscription: SubscriptionWithProfile) => void;
}

export const SubscriptionActionsDropdown = ({
  subscription,
  onView,
  onEdit,
  onCancel,
  onReactivate
}: SubscriptionActionsDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(subscription)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver Detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(subscription)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {subscription.status === 'active' ? (
          <DropdownMenuItem 
            onClick={() => onCancel(subscription)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Cancelar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem 
            onClick={() => onReactivate(subscription)}
            className="text-green-600"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reativar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
