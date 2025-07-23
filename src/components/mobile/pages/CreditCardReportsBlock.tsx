import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useTransactions } from '@/hooks/useTransactions';

interface CreditCardReportsBlockProps {
  dateRange: { from?: Date; to?: Date };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const CreditCardReportsBlock: React.FC<CreditCardReportsBlockProps> = ({ dateRange }) => {
  const { creditCards, isLoading: loadingCards } = useCreditCards();
  const { transactions, isLoading: loadingTransactions } = useTransactions();

  // Filtrar transações do período
  const filteredTransactions = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= dateRange.from && d <= dateRange.to && t.card_id != null;
    });
  }, [transactions, dateRange]);

  // Calcular gastos por cartão
  const cardsWithStats = creditCards.map(card => {
    const gastos = filteredTransactions
      .filter(t => t.card_id === card.id && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const percent = card.credit_limit && card.credit_limit > 0 ? (gastos / card.credit_limit) * 100 : 0;
    return {
      ...card,
      gastos,
      percent,
    };
  });

  // Cartão mais utilizado
  const maxGasto = Math.max(...cardsWithStats.map(c => c.gastos));

  if (loadingCards || loadingTransactions) {
    return (
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Cartões de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Carregando cartões...</div>
        </CardContent>
      </Card>
    );
  }

  if (creditCards.length === 0) {
    return (
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Cartões de Crédito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Nenhum cartão cadastrado</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">Cartões de Crédito</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cardsWithStats.map(card => {
          const isMost = card.gastos === maxGasto && card.gastos > 0;
          return (
            <div key={card.id} className={`rounded-lg border p-3 flex flex-col gap-1 ${isMost ? 'border-purple-500 bg-purple-50/30' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: card.color }} />
                <span className="font-semibold text-sm text-gray-900 truncate flex-1">{card.name}</span>
                {isMost && <span className="text-xs text-purple-700 font-bold ml-2">+ utilizado</span>}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Limite: <span className="font-medium text-gray-700">{card.credit_limit ? formatCurrency(card.credit_limit) : '-'}</span></span>
                <span>Saldo atual: <span className="font-medium text-blue-700">{formatCurrency(card.current_balance)}</span></span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Gasto no período: <span className="font-medium text-red-700">{formatCurrency(card.gastos)}</span></span>
                <span>Uso: <span className="font-medium text-purple-700">{card.percent.toFixed(1)}%</span></span>
              </div>
              <div className="w-full bg-muted rounded-full h-1 mt-1">
                <div
                  className="h-1 rounded-full"
                  style={{ width: `${Math.min(card.percent, 100)}%`, backgroundColor: card.color }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}; 