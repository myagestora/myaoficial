import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Edit,
  Trash2
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const MobileTransactions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todas');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Buscar transações reais
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Função para deletar transação com confirmação
  const deleteTransaction = async (transactionId: string, transactionTitle: string) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir a transação "${transactionTitle}"? Esta ação não pode ser desfeita.`);
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir transação",
        description: "Ocorreu um erro ao tentar excluir a transação.",
        variant: "destructive",
      });
    }
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

      {/* Resumo rápido */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-green-700">Receitas</p>
                <p className="text-sm font-semibold text-green-800">{formatCurrency(income)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-red-700">Despesas</p>
                <p className="text-sm font-semibold text-red-800">{formatCurrency(expenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e filtros */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {['todas', 'receitas', 'despesas'].map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? 'default' : 'outline'}
              size="sm"
              className="flex-shrink-0 capitalize"
              onClick={() => setSelectedFilter(filter)}
            >
              {filter}
            </Button>
          ))}
          <Button variant="outline" size="sm" className="flex-shrink-0">
            <Filter size={16} className="mr-1" />
            Mais filtros
          </Button>
        </div>
      </div>

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
            <Card key={transaction.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {transaction.type === 'income' ? 
                          <TrendingUp size={18} /> : 
                          <TrendingDown size={18} />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{transaction.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {transaction.categories?.name || 'Sem categoria'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Calendar size={12} className="mr-1" />
                            {formatDate(transaction.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex space-x-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/transactions/editar/${transaction.id}`)}
                    >
                      <Edit size={14} className="mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteTransaction(transaction.id, transaction.title)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredTransactions.length === 0 && !isLoading && (
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
      )}

    </MobilePageWrapper>
  );
};