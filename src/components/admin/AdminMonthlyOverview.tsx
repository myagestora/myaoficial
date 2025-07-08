
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminMonthlyOverviewProps {
  dateRange?: DateRange;
}

export const AdminMonthlyOverview = ({ dateRange }: AdminMonthlyOverviewProps) => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['admin-monthly-overview', dateRange],
    queryFn: async () => {
      console.log('📊 Buscando dados mensais para admin...');
      
      // Definir período - últimos 6 meses por padrão ou baseado no filtro
      const endDate = dateRange?.to || new Date();
      const startDate = dateRange?.from || subMonths(endDate, 5);
      
      // Buscar novos usuários por mês
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
      }

      // Buscar assinaturas por mês
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (subscriptionsError) {
        console.error('Erro ao buscar assinaturas:', subscriptionsError);
      }

      // Gerar dados por mês
      const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) });
      
      const chartData = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        
        const newUsers = users?.filter(user => {
          const userDate = new Date(user.created_at!);
          return userDate >= monthStart && userDate <= monthEnd;
        }).length || 0;
        
        const newSubscriptions = subscriptions?.filter(sub => {
          const subDate = new Date(sub.created_at!);
          return subDate >= monthStart && subDate <= monthEnd && sub.status === 'active';
        }).length || 0;
        
        return {
          month: format(month, 'MMM/yy', { locale: ptBR }),
          usuarios: newUsers,
          assinaturas: newSubscriptions,
        };
      });

      console.log('📊 Dados mensais processados:', chartData);
      return chartData;
    }
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Crescimento Mensal</CardTitle>
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
    usuarios: {
      label: "Novos Usuários",
      color: "#3B82F6",
    },
    assinaturas: {
      label: "Novas Assinaturas",
      color: "#10B981",
    },
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Crescimento Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="usuarios" fill="var(--color-usuarios)" />
              <Bar dataKey="assinaturas" fill="var(--color-assinaturas)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
