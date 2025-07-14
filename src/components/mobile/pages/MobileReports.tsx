import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  DollarSign,
  PieChart
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const MobileReports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const { user } = useAuth();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Buscar dados de transações
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions-reports', user?.id, selectedPeriod],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let dateFrom, dateTo;
      const now = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateTo = now;
          break;
        case 'quarter':
          dateFrom = subMonths(now, 3);
          dateTo = now;
          break;
        case 'year':
          dateFrom = subMonths(now, 12);
          dateTo = now;
          break;
        default: // month
          dateFrom = startOfMonth(now);
          dateTo = endOfMonth(now);
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .gte('date', dateFrom.toISOString().split('T')[0])
        .lte('date', dateTo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Calcular dados dos últimos meses
  const { data: monthlyData = [] } = useQuery({
    queryKey: ['monthly-reports', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const months = [];
      const now = new Date();
      
      for (let i = 3; i >= 0; i--) {
        const date = subMonths(now, i);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        
        const { data, error } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);
        
        if (!error && data) {
          const income = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          const expense = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
          
          months.push({
            month: format(date, 'MMM', { locale: ptBR }),
            income,
            expense
          });
        }
      }
      
      return months;
    },
    enabled: !!user?.id
  });

  // Calcular dados por categoria
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  
  const categoriesData = expenses.reduce((acc, transaction) => {
    const categoryName = transaction.categories?.name || 'Sem categoria';
    const categoryColor = transaction.categories?.color || '#9C27B0';
    
    if (!acc[categoryName]) {
      acc[categoryName] = {
        name: categoryName,
        amount: 0,
        color: categoryColor
      };
    }
    
    acc[categoryName].amount += transaction.amount;
    return acc;
  }, {} as Record<string, { name: string; amount: number; color: string }>);

  const categories = Object.values(categoriesData)
    .map(cat => ({
      ...cat,
      percentage: totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Calcular totais do período atual
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenseTotal;

  return (
    <MobilePageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <BarChart3 className="h-6 w-6 mr-2" />
          Relatórios
        </h1>
        <Button variant="outline" size="sm">
          <Download size={16} className="mr-1" />
          Exportar
        </Button>
      </div>

      {/* Filtros de período */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'week', label: 'Semana' },
          { key: 'month', label: 'Mês' },
          { key: 'quarter', label: 'Trimestre' },
          { key: 'year', label: 'Ano' }
        ].map((period) => (
          <Button
            key={period.key}
            variant={selectedPeriod === period.key ? 'default' : 'outline'}
            size="sm"
            className="flex-shrink-0"
            onClick={() => setSelectedPeriod(period.key)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Resumo do período */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 mb-1">Total Receitas</p>
                <p className="text-lg font-bold text-green-800">{formatCurrency(income)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 mb-1">Total Despesas</p>
                <p className="text-lg font-bold text-red-800">{formatCurrency(expenseTotal)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saldo líquido */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saldo Líquido</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(balance))}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {income > 0 ? `${Math.round((balance / income) * 100)}% da sua renda` : 'Sem receitas no período'}
          </p>
        </CardContent>
      </Card>

      {/* Gastos por categoria */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <PieChart className="h-4 w-4 mr-2" />
            Gastos por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-2" />
              </div>
            ))
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma despesa encontrada no período
            </p>
          ) : (
            categories.map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(category.amount)}</p>
                    <p className="text-xs text-muted-foreground">{category.percentage}%</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${category.percentage}%`,
                      backgroundColor: category.color 
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Evolução mensal */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Evolução dos Últimos Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((data, index) => {
              const balance = data.income - data.expense;
              const isPositive = balance > 0;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{data.month}/25</span>
                    <Badge variant={isPositive ? 'default' : 'destructive'}>
                      {isPositive ? '+' : ''}{formatCurrency(balance)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-green-600">
                      Receitas: {formatCurrency(data.income)}
                    </div>
                    <div className="text-red-600">
                      Despesas: {formatCurrency(data.expense)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 text-sm mb-2">Insights do Mês</h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Seus gastos com alimentação aumentaram 15%</li>
                <li>• Você está economizando mais que o mês passado</li>
                <li>• Meta de economia do mês foi atingida</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </MobilePageWrapper>
  );
};