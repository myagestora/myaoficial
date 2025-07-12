import React, { useState } from 'react';
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
  CreditCard
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useNavigate } from 'react-router-dom';

export const MobileTransactions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todas');
  const navigate = useNavigate();

  const transactions = [
    {
      id: 1,
      title: 'Supermercado Extra',
      category: 'Alimentação',
      amount: -89.50,
      type: 'expense',
      date: '2025-01-12',
      time: '14:30'
    },
    {
      id: 2,
      title: 'Salário',
      category: 'Salário',
      amount: 5000.00,
      type: 'income',
      date: '2025-01-10',
      time: '09:00'
    },
    {
      id: 3,
      title: 'Conta de Luz',
      category: 'Contas',
      amount: -156.78,
      type: 'expense',
      date: '2025-01-09',
      time: '16:45'
    },
    {
      id: 4,
      title: 'Freelance',
      category: 'Renda Extra',
      amount: 800.00,
      type: 'income',
      date: '2025-01-08',
      time: '20:30'
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedFilter === 'todas') return matchesSearch;
    if (selectedFilter === 'receitas') return matchesSearch && transaction.type === 'income';
    if (selectedFilter === 'despesas') return matchesSearch && transaction.type === 'expense';
    
    return matchesSearch;
  });

  return (
    <MobilePageWrapper>
      {/* Header com botão de nova transação */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Transações</h1>
        <Button size="sm" className="flex items-center space-x-2">
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
                <p className="text-sm font-semibold text-green-800">R$ 5.800,00</p>
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
                <p className="text-sm font-semibold text-red-800">R$ 246,28</p>
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
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
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
                        {transaction.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {formatDate(transaction.date)} • {transaction.time}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Botão para carregar mais */}
      <Button variant="outline" className="w-full mt-4">
        Carregar mais transações
      </Button>
    </MobilePageWrapper>
  );
};