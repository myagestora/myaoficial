
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DateRange } from 'react-day-picker';

interface MonthlyOverviewProps {
  dateRange: DateRange | undefined;
}

export const MonthlyOverview = ({ dateRange, hideTitle }: MonthlyOverviewProps & { hideTitle?: boolean }) => {
  const { user } = useAuth();

  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ['monthly-overview', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return [];

      // Se não há filtro de período, usar os últimos 6 meses
      let startDate, endDate;
      if (dateRange?.from && dateRange?.to) {
        startDate = dateRange.from;
        endDate = dateRange.to;
      } else {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 5);
        endDate = new Date();
      }
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching monthly data:', error);
        return [];
      }

      // Agrupar por mês
      const monthlyStats: { [key: string]: { income: number; expense: number } } = {};
      
      transactions?.forEach(transaction => {
        const monthKey = transaction.date.substring(0, 7); // YYYY-MM
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { income: 0, expense: 0 };
        }
        
        if (transaction.type === 'income') {
          monthlyStats[monthKey].income += Number(transaction.amount);
        } else {
          monthlyStats[monthKey].expense += Number(transaction.amount);
        }
      });

      // Converter para formato do gráfico
      return Object.entries(monthlyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, stats]) => {
          const [year, month] = monthKey.split('-');
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          
          return {
            month: monthNames[parseInt(month) - 1],
            saldo: stats.income - stats.expense,
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
          <p className="text-blue-600 font-medium">
            Saldo: R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        {!hideTitle && (
          <CardHeader>
            <CardTitle>Evolução do Saldo no Período</CardTitle>
          </CardHeader>
        )}
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
      {!hideTitle && (
        <CardHeader>
          <CardTitle>Evolução do Saldo no Período</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="saldo" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
