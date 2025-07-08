
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const MonthlyOverview = () => {
  const { user } = useAuth();

  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ['monthly-overview', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar transações dos últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching monthly data:', error);
        return [];
      }

      // Agrupar por mês
      const monthlyStats: { [key: string]: { income: number; expense: number } } = {};
      
      // Inicializar os últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
        monthlyStats[monthKey] = { income: 0, expense: 0 };
      }

      // Agrupar transações por mês
      transactions?.forEach(transaction => {
        const monthKey = transaction.date.substring(0, 7);
        if (monthlyStats[monthKey]) {
          if (transaction.type === 'income') {
            monthlyStats[monthKey].income += Number(transaction.amount);
          } else {
            monthlyStats[monthKey].expense += Number(transaction.amount);
          }
        }
      });

      // Converter para formato do gráfico
      return Object.entries(monthlyStats).map(([monthKey, stats]) => {
        const [year, month] = monthKey.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        return {
          month: monthNames[parseInt(month) - 1],
          income: stats.income,
          expenses: stats.expense
        };
      });
    },
    enabled: !!user?.id
  });

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visão Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-[300px] bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
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
