
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle, Edit, Trash2 } from 'lucide-react';
import { TransactionForm } from '@/components/transactions/TransactionForm';

const Transactions = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const mockTransactions = [
    {
      id: 1,
      description: 'Salário',
      amount: 5000.00,
      type: 'income',
      category: 'Trabalho',
      date: '2024-01-07',
    },
    {
      id: 2,
      description: 'Supermercado Extra',
      amount: -350.00,
      type: 'expense',
      category: 'Alimentação',
      date: '2024-01-06',
    },
    {
      id: 3,
      description: 'Conta de Luz CEMIG',
      amount: -180.00,
      type: 'expense',
      category: 'Utilidades',
      date: '2024-01-05',
    },
    {
      id: 4,
      description: 'Projeto Freelance',
      amount: 800.00,
      type: 'income',
      category: 'Trabalho',
      date: '2024-01-04',
    },
    {
      id: 5,
      description: 'Academia Smart Fit',
      amount: -120.00,
      type: 'expense',
      category: 'Saúde',
      date: '2024-01-03',
    },
    {
      id: 6,
      description: 'Uber',
      amount: -25.00,
      type: 'expense',
      category: 'Transporte',
      date: '2024-01-02',
    },
    {
      id: 7,
      description: 'Dividendos',
      amount: 150.00,
      type: 'income',
      category: 'Investimentos',
      date: '2024-01-01',
    },
  ];

  const filteredTransactions = mockTransactions.filter(transaction =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transações</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie suas receitas e despesas</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar transações..."
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

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                      : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                  }`}>
                    {transaction.type === 'income' ? (
                      <ArrowUpCircle className="h-5 w-5" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-lg">{transaction.description}</p>
                    <div className="flex items-center space-x-3 mt-1">
                      <Badge variant="secondary">
                        {transaction.category}
                      </Badge>
                      <span className="text-sm text-gray-500">{transaction.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`font-bold text-xl ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : ''}R$ {Math.abs(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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

export default Transactions;
