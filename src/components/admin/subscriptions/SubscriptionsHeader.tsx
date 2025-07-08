
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SubscriptionsHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  subscriptionsCount: number;
}

export const SubscriptionsHeader = ({
  searchTerm,
  onSearchChange,
  subscriptionsCount
}: SubscriptionsHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assinaturas dos Clientes</h1>
        <p className="text-gray-600 dark:text-gray-400">Gerencie as assinaturas ativas dos usuários</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nome, email ou plano..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-80"
          />
        </div>
      </div>
    </div>
  );
};
