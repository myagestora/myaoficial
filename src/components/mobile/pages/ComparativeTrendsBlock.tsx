import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ComparativeTrendsBlockProps {
  reportData: any;
  isLoading: boolean;
  dateRange: { from?: Date; to?: Date };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const ComparativeTrendsBlock: React.FC<ComparativeTrendsBlockProps> = ({ reportData, isLoading, dateRange }) => {
  // Recalcular monthlyData, income, expenses e saldo a partir das transações (igual desktop)
  const transactions = reportData.transactions || [];
  // Filtrar pelo período selecionado
  const filteredTransactions = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return transactions;
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [transactions, dateRange]);
  const monthOrder = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const monthNames = {
    jan: 'Jan', fev: 'Fev', mar: 'Mar', abr: 'Abr', mai: 'Mai', jun: 'Jun',
    jul: 'Jul', ago: 'Ago', set: 'Set', out: 'Out', nov: 'Nov', dez: 'Dez',
  };
  const monthlyData = React.useMemo(() => {
    return filteredTransactions.reduce((acc: any, transaction: any) => {
      const month = transaction.date ? new Date(transaction.date) : null;
      if (!month) return acc;
      const monthStr = month.toLocaleString('pt-BR', { month: 'short' }).toLowerCase();
      if (!acc[monthStr]) {
        acc[monthStr] = { month: monthStr, income: 0, expenses: 0, balance: 0 };
      }
      if (transaction.type === 'income') {
        acc[monthStr].income += Number(transaction.amount);
      } else if (transaction.type === 'expense') {
        acc[monthStr].expenses += Number(transaction.amount);
      }
      acc[monthStr].balance = acc[monthStr].income - acc[monthStr].expenses;
      return acc;
    }, {});
  }, [filteredTransactions]);
  const monthly = Object.values(monthlyData).sort((a: any, b: any) => {
    return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
  }).map((m: any) => ({ ...m, month: monthNames[m.month] || m.month }));

  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  function trendIcon(val: number) {
    return val >= 0 ? <TrendingUp className="inline w-4 h-4 text-green-600" /> : <TrendingDown className="inline w-4 h-4 text-red-600" />;
  }

  if (isLoading) {
    return (
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Comparativos e Tendências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Carregando tendências...</div>
        </CardContent>
      </Card>
    );
  }

  if (!monthly || monthly.length === 0) {
    return null;
  }

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">Comparativos e Tendências</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gráfico de linha da evolução do saldo */}
        <div>
          <div className="font-semibold text-xs text-blue-700 mb-1">Evolução do Saldo</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={monthly} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', strokeWidth: 2, r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Tabela comparativa mês a mês */}
        <div>
          <div className="font-semibold text-xs text-gray-700 mb-1">Receitas, Despesas e Saldo por mês</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border rounded">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left">Mês</th>
                  <th className="px-2 py-1 text-green-700">Receitas</th>
                  <th className="px-2 py-1 text-red-700">Despesas</th>
                  <th className="px-2 py-1 text-blue-700">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => (
                  <tr key={m.month} className="border-t">
                    <td className="px-2 py-1 font-medium">{m.month}</td>
                    <td className="px-2 py-1 text-green-700">{formatCurrency(m.income)}</td>
                    <td className="px-2 py-1 text-red-700">{formatCurrency(m.expenses)}</td>
                    <td className={`px-2 py-1 font-bold ${m.balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatCurrency(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 