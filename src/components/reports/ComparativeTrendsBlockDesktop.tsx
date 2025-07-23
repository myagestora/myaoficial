import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ComparativeTrendsBlockDesktopProps {
  transactionData: any;
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const ComparativeTrendsBlockDesktop: React.FC<ComparativeTrendsBlockDesktopProps> = ({ transactionData, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Comparativos e Tendências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Carregando tendências...</div>
        </CardContent>
      </Card>
    );
  }

  if (!transactionData || !transactionData.monthlyData) {
    return null;
  }

  // Ordenar meses cronologicamente (abreviação pt-BR)
  const monthOrder = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const monthNames = {
    jan: 'Jan',
    fev: 'Fev',
    mar: 'Mar',
    abr: 'Abr',
    mai: 'Mai',
    jun: 'Jun',
    jul: 'Jul',
    ago: 'Ago',
    set: 'Set',
    out: 'Out',
    nov: 'Nov',
    dez: 'Dez',
  };
  const monthly = [...(transactionData.monthlyData || [])].sort((a, b) => {
    return monthOrder.indexOf(a.month.toLowerCase()) - monthOrder.indexOf(b.month.toLowerCase());
  }).map(m => ({ ...m, month: monthNames[m.month.toLowerCase()] || m.month }));

  // Tendências: comparar último mês com anterior
  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  function trendIcon(val: number) {
    return val >= 0 ? <TrendingUp className="inline w-4 h-4 text-green-600" /> : <TrendingDown className="inline w-4 h-4 text-red-600" />;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">Comparativos e Tendências</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gráfico de linha da evolução do saldo */}
        <div>
          <div className="font-semibold text-sm text-blue-700 mb-2">Evolução do Saldo</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={13} />
              <YAxis fontSize={13} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Tabela comparativa mês a mês */}
        <div>
          <div className="font-semibold text-sm text-gray-700 mb-2">Receitas, Despesas e Saldo por mês</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border rounded">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left">Mês</th>
                  <th className="px-3 py-2 text-green-700 text-center">Receitas</th>
                  <th className="px-3 py-2 text-red-700 text-center">Despesas</th>
                  <th className="px-3 py-2 text-blue-700 text-center">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => (
                  <tr key={m.month} className="border-t">
                    <td className="px-3 py-2 font-medium">{m.month}</td>
                    <td className="px-3 py-2 text-green-700 text-center">{formatCurrency(m.income)}</td>
                    <td className="px-3 py-2 text-red-700 text-center">{formatCurrency(m.expenses)}</td>
                    <td className={`px-3 py-2 font-bold text-center ${m.balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatCurrency(m.balance)}</td>
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