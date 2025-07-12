import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus } from 'lucide-react';

interface EmptyTransactionsStateProps {
  searchTerm: string;
  selectedFilter: string;
}

export const EmptyTransactionsState = ({ searchTerm, selectedFilter }: EmptyTransactionsStateProps) => {
  const navigate = useNavigate();

  return (
    <Card className="mt-6">
      <CardContent className="p-8 text-center">
        <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium text-lg mb-2">Nenhuma transação encontrada</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {searchTerm || selectedFilter !== 'todas' 
            ? 'Tente ajustar os filtros ou termo de busca'
            : 'Comece adicionando sua primeira transação'
          }
        </p>
        <Button onClick={() => navigate('/transactions/nova')}>
          <Plus size={16} className="mr-2" />
          Nova Transação
        </Button>
      </CardContent>
    </Card>
  );
};