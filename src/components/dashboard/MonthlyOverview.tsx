
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MonthlyOverview = () => {
  const mockData = [
    { month: 'Jan', income: 4800, expenses: 3200 },
    { month: 'Fev', income: 5200, expenses: 3800 },
    { month: 'Mar', income: 4900, expenses: 3400 },
    { month: 'Abr', income: 5100, expenses: 3600 },
    { month: 'Mai', income: 5300, expenses: 3900 },
    { month: 'Jun', income: 5000, expenses: 3200 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-green-600">
            Receitas: R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-red-600">
            Despesas: R$ {payload[1].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-blue-600 font-medium">
            Saldo: R$ {(payload[0].value - payload[1].value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="income" fill="#10b981" name="Receitas" />
            <Bar dataKey="expenses" fill="#ef4444" name="Despesas" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
