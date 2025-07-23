import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CategoryReportsBlockDesktopProps {
  transactionData: any;
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const CategoryReportsBlockDesktop: React.FC<CategoryReportsBlockDesktopProps> = ({ transactionData, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Carregando categorias...</div>
        </CardContent>
      </Card>
    );
  }

  if (!transactionData || !transactionData.transactions) {
    return null;
  }

  // Agrupar por categoria e tipo
  const grouped: Record<string, { name: string; color: string; value: number; type: string }[]> = {
    income: [],
    expense: [],
  };
  const totals = { income: 0, expense: 0 };
  transactionData.transactions.forEach((t: any) => {
    if (!t.category || !t.type) return;
    const type = t.type;
    const name = t.category;
    const color = t.categories?.color || '#8884d8';
    const idx = grouped[type].findIndex(c => c.name === name);
    if (idx === -1) {
      grouped[type].push({ name, color, value: t.amount, type });
    } else {
      grouped[type][idx].value += t.amount;
    }
    if (type === 'income') totals.income += t.amount;
    if (type === 'expense') totals.expense += t.amount;
  });

  // Ordenar por valor decrescente
  grouped.income.sort((a, b) => b.value - a.value);
  grouped.expense.sort((a, b) => b.value - a.value);

  const maxIncome = grouped.income[0]?.value || 0;
  const maxExpense = grouped.expense[0]?.value || 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">Categorias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="font-semibold text-sm text-green-700 mb-2">Receitas</div>
          {grouped.income.length === 0 ? (
            <div className="text-xs text-gray-400">Nenhuma receita</div>
          ) : (
            <div className="space-y-1">
              {grouped.income.map(cat => (
                <div key={cat.name} className={`flex items-center gap-2 py-1 px-2 rounded ${cat.value === maxIncome ? 'bg-green-50 border border-green-300' : ''}`}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs flex-1 truncate">{cat.name}</span>
                  <span className="text-xs font-bold text-green-700">{formatCurrency(cat.value)}</span>
                  <span className="text-[11px] text-gray-400 ml-1">{totals.income > 0 ? ((cat.value / totals.income) * 100).toFixed(1) : '0.0'}%</span>
                  {cat.value === maxIncome && <span className="ml-1 text-xs text-green-700 font-bold">+ usada</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="font-semibold text-sm text-red-700 mb-2">Despesas</div>
          {grouped.expense.length === 0 ? (
            <div className="text-xs text-gray-400">Nenhuma despesa</div>
          ) : (
            <>
              <div className="space-y-1 mb-4">
                {grouped.expense.map(cat => (
                  <div key={cat.name} className={`flex items-center gap-2 py-1 px-2 rounded ${cat.value === maxExpense ? 'bg-red-50 border border-red-300' : ''}`}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs flex-1 truncate">{cat.name}</span>
                    <span className="text-xs font-bold text-red-700">{formatCurrency(cat.value)}</span>
                    <span className="text-[11px] text-gray-400 ml-1">{totals.expense > 0 ? ((cat.value / totals.expense) * 100).toFixed(1) : '0.0'}%</span>
                    {cat.value === maxExpense && <span className="ml-1 text-xs text-red-700 font-bold">+ usada</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 