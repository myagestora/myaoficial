
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyMovementProps {
  dateRange: DateRange | undefined;
}

export const DailyMovement = ({ dateRange }: DailyMovementProps) => {
  const { user } = useAuth();

  const { data: dailyData, isLoading } = useQuery({
    queryKey: ['daily-movement', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id || !dateRange?.from || !dateRange?.to) return [];

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', dateRange.from.toISOString().split('T')[0])
        .lte('date', dateRange.to.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching daily movement:', error);
        return [];
      }

      // Agrupar por data
      const dailyStats: { [key: string]: { income: number; expense: number } } = {};
      
      transactions?.forEach(transaction => {
        const dateKey = transaction.date;
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = { income: 0, expense: 0 };
        }
        
        if (transaction.type === 'income') {
          dailyStats[dateKey].income += Number(transaction.amount);
        } else {
          dailyStats[dateKey].expense += Number(transaction.amount);
        }
      });

      // Converter para formato do gráfico
      return Object.entries(dailyStats).map(([date, stats]) => ({
        date: format(new Date(date), 'dd/MM', { locale: ptBR }),
        receitas: stats.income,
        despesas: stats.expense
      }));
    },
    enabled: !!user?.id && !!dateRange?.from && !!dateRange?.to
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
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Movimentação Diária (Entradas e Saídas)</CardTitle>
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
        <CardTitle>Movimentação Diária (Entradas e Saídas)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="receitas" fill="#10b981" name="Receitas Realizadas" />
            <Bar dataKey="despesas" fill="#ef4444" name="Despesas Pagas" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
