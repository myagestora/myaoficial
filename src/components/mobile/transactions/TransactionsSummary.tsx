import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TransactionsSummaryProps {
  income: number;
  expenses: number;
  formatCurrency: (value: number) => string;
}

export const TransactionsSummary = ({ income, expenses, formatCurrency }: TransactionsSummaryProps) => {
  return (
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
  );
};