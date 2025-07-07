
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, ArrowDownCircle, MoreHorizontal } from 'lucide-react';

export const RecentTransactions = () => {
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
      description: 'Supermercado',
      amount: -350.00,
      type: 'expense',
      category: 'Alimentação',
      date: '2024-01-06',
    },
    {
      id: 3,
      description: 'Conta de Luz',
      amount: -180.00,
      type: 'expense',
      category: 'Utilidades',
      date: '2024-01-05',
    },
    {
      id: 4,
      description: 'Freelance',
      amount: 800.00,
      type: 'income',
      category: 'Trabalho',
      date: '2024-01-04',
    },
    {
      id: 5,
      description: 'Academia',
      amount: -120.00,
      type: 'expense',
      category: 'Saúde',
      date: '2024-01-03',
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transações Recentes</CardTitle>
        <Button variant="outline" size="sm">
          Ver Todas
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  transaction.type === 'income' 
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                    : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                }`}>
                  {transaction.type === 'income' ? (
                    <ArrowUpCircle className="h-4 w-4" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {transaction.category}
                    </Badge>
                    <span className="text-xs text-gray-500">{transaction.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`font-bold ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : ''}R$ {Math.abs(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
