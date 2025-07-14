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
  DollarSign,
  PieChart,
  FileText,
  Target,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { exportToCSV, exportToPDF, ReportData, TransactionData } from '@/utils/exportUtils';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';

export const MobileReports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [showCustomRange, setShowCustomRange] = useState(false);
  const { user } = useAuth();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Atualizar dateRange baseado no período selecionado
  const updateDateRange = (period: string) => {
    const now = new Date();
    let from: Date, to: Date;

    switch (period) {
      case 'week':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        to = now;
        break;
      case 'quarter':
        from = subMonths(now, 3);
        to = now;
        break;
      case 'year':
        from = subMonths(now, 12);
        to = now;
        break;
      case 'custom':
        setShowCustomRange(true);
        return;
      default: // month
        from = startOfMonth(now);
        to = endOfMonth(now);
    }

    setDateRange({ from, to });
    setShowCustomRange(false);
  };

  // Buscar dados completos para relatórios
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['mobile-reports', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id || !dateRange?.from || !dateRange?.to) return null;

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (name, color, type)
        `)
        .eq('user_id', user.id)
        .gte('date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      
      if (error) throw error;

      // Processar dados
      const totalIncome = data
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpenses = data
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const balance = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

      // Dados mensais para gráfico de barras
      const monthlyData = data.reduce((acc: any, transaction) => {
        const month = format(new Date(transaction.date), 'MMM', { locale: ptBR });
        if (!acc[month]) {
          acc[month] = { month, income: 0, expenses: 0, balance: 0 };
        }
        if (transaction.type === 'income') {
          acc[month].income += Number(transaction.amount);
        } else {
          acc[month].expenses += Number(transaction.amount);
        }
        acc[month].balance = acc[month].income - acc[month].expenses;
        return acc;
      }, {});

      // Dados por categoria para gráfico de pizza
      const categoryData = data
        .filter(t => t.type === 'expense')
        .reduce((acc: any, transaction) => {
          const categoryName = transaction.categories?.name || 'Sem categoria';
          const categoryColor = transaction.categories?.color || '#8884d8';
          if (!acc[categoryName]) {
            acc[categoryName] = { name: categoryName, value: 0, color: categoryColor };
          }
          acc[categoryName].value += Number(transaction.amount);
          return acc;
        }, {});

      // Dados de tendência para gráfico de linha
      const trendData = Object.values(monthlyData).map((item: any) => ({
        month: item.month,
        value: item.balance
      }));

      // Preparar transações para exportação
      const transactions: TransactionData[] = data.map(t => ({
        date: t.date,
        title: t.title,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense',
        category: t.categories?.name || 'Sem categoria',
        description: t.description || ''
      }));

      return {
        totalIncome,
        totalExpenses,
        balance,
        savingsRate,
        monthlyData: Object.values(monthlyData),
        categoryData: Object.values(categoryData),
        trendData,
        transactions
      };
    },
    enabled: !!user?.id && !!dateRange?.from && !!dateRange?.to
  });

  // Buscar metas
  const { data: goalsData } = useQuery({
    queryKey: ['mobile-reports-goals', user?.id, dateRange],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: goals, error } = await supabase
        .from('goals')
        .select(`
          *,
          categories (name, color)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      // Calcular progresso para cada meta
      const goalsWithProgress = await Promise.all(
        (goals || []).map(async (goal) => {
          if (goal.goal_type === 'monthly_budget' && goal.category_id && goal.month_year) {
            const [goalYear, goalMonth] = goal.month_year.split('-').map(Number);
            const startDate = new Date(goalYear, goalMonth - 1, 1);
            const endDate = new Date(goalYear, goalMonth, 1);

            const { data: transactions } = await supabase
              .from('transactions')
              .select('amount')
              .eq('user_id', user.id)
              .eq('category_id', goal.category_id)
              .eq('type', 'expense')
              .gte('date', startDate.toISOString().split('T')[0])
              .lt('date', endDate.toISOString().split('T')[0]);

            const spentAmount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
            const targetAmount = Number(goal.target_amount || 0);
            const usagePercentage = targetAmount > 0 ? (spentAmount / targetAmount) * 100 : 0;
            
            return {
              ...goal,
              spentAmount,
              usagePercentage,
              status: spentAmount <= targetAmount ? 'on_track' : 'exceeded'
            };
          } else {
            const currentAmount = Number(goal.current_amount || 0);
            const targetAmount = Number(goal.target_amount || 0);
            const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            
            return {
              ...goal,
              currentAmount,
              progressPercentage,
              status: progressPercentage >= 100 ? 'completed' : progressPercentage >= 75 ? 'on_track' : 'behind'
            };
          }
        })
      );

      return goalsWithProgress;
    },
    enabled: !!user?.id
  });

  const handleExportCSV = () => {
    if (!reportData || !dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Erro',
        description: 'Dados não disponíveis para exportação',
        variant: 'destructive',
      });
      return;
    }

    const exportData: ReportData = {
      totalIncome: reportData.totalIncome,
      totalExpenses: reportData.totalExpenses,
      balance: reportData.balance,
      savingsRate: reportData.savingsRate,
      transactions: reportData.transactions,
      dateRange: {
        from: format(dateRange.from, 'dd/MM/yyyy'),
        to: format(dateRange.to, 'dd/MM/yyyy')
      }
    };

    exportToCSV(exportData);
    toast({
      title: 'Sucesso',
      description: 'Relatório CSV exportado com sucesso!',
    });
  };

  const handleExportPDF = async () => {
    if (!reportData || !dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Erro',
        description: 'Dados não disponíveis para exportação',
        variant: 'destructive',
      });
      return;
    }

    const exportData: ReportData = {
      totalIncome: reportData.totalIncome,
      totalExpenses: reportData.totalExpenses,
      balance: reportData.balance,
      savingsRate: reportData.savingsRate,
      transactions: reportData.transactions,
      dateRange: {
        from: format(dateRange.from, 'dd/MM/yyyy'),
        to: format(dateRange.to, 'dd/MM/yyyy')
      }
    };

    try {
      await exportToPDF(exportData);
      toast({
        title: 'Sucesso',
        description: 'Relatório PDF gerado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar o relatório PDF',
        variant: 'destructive',
      });
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  return (
    <MobilePageWrapper className="bg-gradient-to-br from-background to-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center text-foreground">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg mr-3">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          Relatórios
        </h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="shadow-md border-primary/20">
            <Download size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="shadow-md border-primary/20">
            <FileText size={16} />
          </Button>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="space-y-4 mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[
            { key: 'week', label: 'Semana' },
            { key: 'month', label: 'Mês' },
            { key: 'quarter', label: 'Trimestre' },
            { key: 'year', label: 'Ano' },
            { key: 'custom', label: 'Personalizado' }
          ].map((period) => (
            <Button
              key={period.key}
              variant={selectedPeriod === period.key ? 'default' : 'outline'}
              size="sm"
              className="flex-shrink-0"
              onClick={() => {
                setSelectedPeriod(period.key);
                updateDateRange(period.key);
              }}
            >
              {period.label}
            </Button>
          ))}
        </div>

        {showCustomRange && (
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando relatórios...</div>
        </div>
      ) : reportData ? (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700 mb-1">Receitas</p>
                    <p className="text-lg font-bold text-emerald-800">{formatCurrency(reportData.totalIncome)}</p>
                  </div>
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 mb-1">Despesas</p>
                    <p className="text-lg font-bold text-red-800">{formatCurrency(reportData.totalExpenses)}</p>
                  </div>
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cards adicionais */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Saldo Líquido</p>
                    <p className={`text-2xl font-bold ${reportData.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(reportData.balance))}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Taxa de Poupança: {reportData.savingsRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Receitas vs Despesas */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Receitas vs Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={reportData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="income" fill="#10b981" name="Receitas" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Gastos por Categoria */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <PieChart className="h-4 w-4 mr-2" />
                Gastos por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={reportData.categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {reportData.categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Tendência */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tendência de Economia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={reportData.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Seção de Metas */}
          {goalsData && goalsData.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Progresso das Metas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {goalsData.map((goal: any) => (
                  <div key={goal.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: goal.categories?.color || '#3B82F6' }}
                        />
                        <span className="font-medium text-sm">{goal.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {goal.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {goal.status === 'exceeded' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        {goal.status === 'on_track' && <TrendingUp className="h-4 w-4 text-blue-600" />}
                        <Badge variant={goal.status === 'exceeded' ? 'destructive' : 'default'} className="text-xs">
                          {goal.status === 'completed' ? 'Concluída' :
                           goal.status === 'exceeded' ? 'Ultrapassada' :
                           goal.status === 'on_track' ? 'No Prazo' : 'Atrasada'}
                        </Badge>
                      </div>
                    </div>
                    
                    {goal.goal_type === 'monthly_budget' ? (
                      <div className="text-xs text-muted-foreground">
                        <p>Gasto: {formatCurrency(goal.spentAmount)} de {formatCurrency(goal.target_amount)}</p>
                        <div className="w-full bg-muted rounded-full h-1 mt-1">
                          <div 
                            className={`h-1 rounded-full ${goal.status === 'exceeded' ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(goal.usagePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        <p>Progresso: {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.target_amount)}</p>
                        <div className="w-full bg-muted rounded-full h-1 mt-1">
                          <div 
                            className="bg-green-500 h-1 rounded-full"
                            style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum dado encontrado para o período selecionado.</p>
          </CardContent>
        </Card>
      )}
    </MobilePageWrapper>
  );
};