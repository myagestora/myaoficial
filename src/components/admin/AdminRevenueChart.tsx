
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminRevenueChartProps {
  dateRange?: DateRange;
}

export const AdminRevenueChart = ({ dateRange }: AdminRevenueChartProps) => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['admin-revenue-chart', dateRange],
    queryFn: async () => {
      console.log('💰 Buscando dados de receita para admin...');
      
      // Definir período - últimos 6 meses por padrão ou baseado no filtro
      const endDate = dateRange?.to || new Date();
      const startDate = dateRange?.from || subMonths(endDate, 5);
      
      // Buscar assinaturas ativas com planos por mês
      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select(`
          created_at,
          status,
          subscription_plans (
            price_monthly
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'active');
      
      if (error) {
        console.error('Erro ao buscar dados de receita:', error);
        return [];
      }

      // Gerar dados por mês
      const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) });
      
      let accumulatedRevenue = 0;
      
      const chartData = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        
        const monthlyNewRevenue = subscriptions?.filter(sub => {
          const subDate = new Date(sub.created_at!);
          return subDate >= monthStart && subDate <= monthEnd;
        }).reduce((total, sub) => {
          const plan = sub.subscription_plans as any;
          return total + (plan?.price_monthly || 0);
        }, 0) || 0;
        
        accumulatedRevenue += monthlyNewRevenue;
        
        return {
          month: format(month, 'MMM/yy', { locale: ptBR }),
          receita: accumulatedRevenue,
        };
      });

      console.log('💰 Dados de receita processados:', chartData);
      return chartData;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Carregando gráfico...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    receita: {
      label: "Receita Acumulada",
      color: "#8B5CF6",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução da Receita</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: any) => [
                  `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  'Receita'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="receita" 
                stroke="var(--color-receita)" 
                strokeWidth={3}
                dot={{ fill: "var(--color-receita)", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
