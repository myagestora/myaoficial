import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionsSummary } from '../transactions/TransactionsSummary';
import { TransactionsFilters } from '../transactions/TransactionsFilters';
import { TransactionCard } from '../transactions/TransactionCard';
import { EmptyTransactionsState } from '../transactions/EmptyTransactionsState';

export const MobileTransactions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todas');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { transactions, isLoading, deleteTransaction } = useTransactions();

  // Função para confirmar exclusão
  const confirmDelete = (transactionId: string) => {
    setDeletingId(transactionId);
  };

  // Função para cancelar exclusão
  const cancelDelete = () => {
    setDeletingId(null);
  };

  // Função para deletar transação
  const handleDelete = (transactionId: string) => {
    deleteTransaction(transactionId);
    setDeletingId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'dd/MM', { locale: ptBR });
    } catch {
      return date;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const categoryName = transaction.categories?.name || '';
    const matchesSearch = transaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedFilter === 'todas') return matchesSearch;
    if (selectedFilter === 'receitas') return matchesSearch && transaction.type === 'income';
    if (selectedFilter === 'despesas') return matchesSearch && transaction.type === 'expense';
    
    return matchesSearch;
  });

  // Calcular estatísticas
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return (
    <MobilePageWrapper>
      {/* Header com botão de nova transação */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Transações</h1>
        <Button 
          size="sm" 
          className="flex items-center space-x-2"
          onClick={() => navigate('/transactions/nova')}
        >
          <Plus size={16} />
          <span>Nova</span>
        </Button>
      </div>

      <TransactionsSummary 
        income={income}
        expenses={expenses}
        formatCurrency={formatCurrency}
      />

      <TransactionsFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
      />

      {/* Lista de transações */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              deletingId={deletingId}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onConfirmDelete={confirmDelete}
              onCancelDelete={cancelDelete}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {filteredTransactions.length === 0 && !isLoading && (
        <EmptyTransactionsState 
          searchTerm={searchTerm}
          selectedFilter={selectedFilter}
        />
      )}

    </MobilePageWrapper>
  );
};