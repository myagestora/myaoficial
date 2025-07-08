
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle, Edit, Trash2, Repeat, Calendar, Play, Pause } from 'lucide-react';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const Scheduled = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: scheduledTransactions, isLoading } = useQuery({
    queryKey: ['scheduled-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          description,
          amount,
          type,
          date,
          is_recurring,
          recurrence_frequency,
          recurrence_interval,
          recurrence_end_date,
          next_recurrence_date,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .eq('is_recurring', true)
        .order('next_recurrence_date', { ascending: true });

      if (error) {
        console.error('Error fetching scheduled transactions:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  const toggleRecurringStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          is_recurring: isActive,
          next_recurrence_date: isActive ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Status do agendamento atualizado.',
      });
    },
    onError: (error) => {
      console.error('Error updating recurring status:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao atualizar agendamento.',
        variant: 'destructive',
      });
    }
  });

  const deleteScheduledTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      toast({
        title: 'Sucesso!',
        description: 'Agendamento excluído com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting scheduled transaction:', error);
      toast({
        title: 'Erro!',
        description: 'Erro ao excluir agendamento.',
        variant: 'destructive',
      });
    }
  });

  const filteredTransactions = scheduledTransactions?.filter(transaction =>
    transaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatRecurrenceInfo = (transaction: any) => {
    const frequencyMap = {
      daily: 'Diário',
      weekly: 'Semanal', 
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    };
    
    const frequency = frequencyMap[transaction.recurrence_frequency as keyof typeof frequencyMap];
    const interval = transaction.recurrence_interval > 1 ? ` (${transaction.recurrence_interval}x)` : '';
    
    return `${frequency}${interval}`;
  };

  const getNextExecutionDate = (transaction: any) => {
    if (!transaction.next_recurrence_date) return 'Não definido';
    
    const nextDate = new Date(transaction.next_recurrence_date);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays < 0) return 'Atrasado';
    
    return `Em ${diffDays} dias`;
  };

  const getStatusColor = (transaction: any) => {
    if (!transaction.next_recurrence_date) return 'bg-gray-500';
    
    const nextDate = new Date(transaction.next_recurrence_date);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'bg-red-500';
    if (diffDays <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
            <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie suas transações recorrentes</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Execuções</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredTransactions.filter(t => {
                const nextDate = new Date(t.next_recurrence_date);
                const today = new Date();
                const diffTime = nextDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Atrasados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredTransactions.filter(t => {
                const nextDate = new Date(t.next_recurrence_date);
                const today = new Date();
                return nextDate < today;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar agendamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Agendadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhum agendamento encontrado</p>
                <p className="text-sm text-gray-400 mt-2">
                  Comece criando seu primeiro agendamento!
                </p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full relative ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                        : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowUpCircle className="h-5 w-5" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5" />
                      )}
                      <Repeat className="h-3 w-3 absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-lg">{transaction.title}</p>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(transaction)}`} />
                      </div>
                      <div className="flex items-center space-x-3 mt-1">
                        {transaction.categories && (
                          <Badge 
                            variant="secondary"
                            style={{ 
                              backgroundColor: transaction.categories.color + '20',
                              color: transaction.categories.color,
                              borderColor: transaction.categories.color
                            }}
                          >
                            {transaction.categories.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          <Repeat className="h-3 w-3 mr-1" />
                          {formatRecurrenceInfo(transaction)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {getNextExecutionDate(transaction)}
                        </span>
                      </div>
                      {transaction.description && (
                        <p className="text-sm text-gray-500 mt-1">{transaction.description}</p>
                      )}
                      {transaction.next_recurrence_date && (
                        <p className="text-xs text-blue-600 mt-1">
                          Próxima execução: {new Date(transaction.next_recurrence_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {transaction.recurrence_end_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Termina em: {new Date(transaction.recurrence_end_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`font-bold text-xl ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : ''}R$ {Math.abs(Number(transaction.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleRecurringStatus.mutate({ id: transaction.id, isActive: !transaction.is_recurring })}
                        title={transaction.is_recurring ? 'Pausar agendamento' : 'Ativar agendamento'}
                      >
                        {transaction.is_recurring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" title="Editar agendamento">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deleteScheduledTransaction.mutate(transaction.id)}
                        title="Excluir agendamento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Form Modal */}
      <TransactionForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
      />
    </div>
  );
};

export default Scheduled;
