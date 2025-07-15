
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DateRange } from 'react-day-picker';
import { getCurrentDateForInput } from '@/utils/timezoneUtils';

interface ExpenseChartProps {
  dateRange: DateRange | undefined;
}

export const ExpenseChart = ({ dateRange }: ExpenseChartProps) => {
  const { user } = useAuth();

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ['expense-chart', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('transactions')
        .select(`
          amount,
          date,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense');

      if (dateRange?.from && dateRange?.to) {
        query = query
          .gte('date', dateRange.from.toISOString().split('T')[0])
          .lte('date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data: transactions, error } = await query;

      if (error) {
        console.error('Error fetching expense data:', error);
        return [];
      }

      // Separar despesas pagas (passadas) e a pagar (futuras)
      const today = getCurrentDateForInput();
      const categoryTotals: { [key: string]: { paid: number; pending: number; color: string } } = {};
      
      transactions?.forEach(transaction => {
        const categoryName = transaction.categories?.name || 'Sem categoria';
        const categoryColor = transaction.categories?.color || '#8884d8';
        const isPaid = transaction.date <= today;
        
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = { paid: 0, pending: 0, color: categoryColor };
        }
        
        if (isPaid) {
          categoryTotals[categoryName].paid += Number(transaction.amount);
        } else {
          categoryTotals[categoryName].pending += Number(transaction.amount);
        }
      });

      // Converter para formato do gráfico - separando pagas e a pagar
      const result = [];
      Object.entries(categoryTotals).forEach(([name, data]) => {
        if (data.paid > 0) {
          result.push({
            name: `${name} (Pago)`,
            value: data.paid,
            color: data.color,
            type: 'paid'
          });
        }
        if (data.pending > 0) {
          result.push({
            name: `${name} (A Pagar)`,
            value: data.pending,
            color: `${data.color}80`, // Cor mais clara para despesas a pagar
            type: 'pending'
          });
        }
      });

      return result;
    },
    enabled: !!user?.id
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const totalExpenses = expenseData?.reduce((acc, item) => acc + item.value, 0) || 0;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">
            R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">
            {totalExpenses > 0 ? ((data.value / totalExpenses) * 100).toFixed(1) : 0}%
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
          <CardTitle>Despesas (Pagas e A Pagar)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-[300px] bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!expenseData || expenseData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Despesas (Pagas e A Pagar)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-gray-500">Nenhuma despesa encontrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas (Pagas e A Pagar)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={expenseData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {expenseData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
