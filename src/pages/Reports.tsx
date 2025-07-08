import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Download, FileText, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { addDays, startOfMonth, endOfMonth, format } from 'date-fns';
import { exportToCSV, exportToPDF, ReportData, TransactionData } from '@/utils/exportUtils';
import { toast } from 'sonner';

const Reports = () => {
  const [reportType, setReportType] = useState('monthly');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const { data: transactionData, isLoading } = useQuery({
    queryKey: ['reports-transactions', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories (name, color, type)
        `)
        .gte('date', dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd'))
        .lte('date', dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(endOfMonth(new Date()), 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      // Process data for charts
      const totalIncome = data
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalExpenses = data
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const balance = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

      // Monthly data for bar chart
      const monthlyData = data.reduce((acc: any, transaction) => {
        const month = format(new Date(transaction.date), 'MMM');
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

      // Category data for pie chart
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

      // Trend data for line chart
      const trendData = Object.values(monthlyData).map((item: any) => ({
        month: item.month,
        value: item.balance
      }));

      // Prepare transactions for export
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
    }
  });

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const handleExportCSV = () => {
    if (!transactionData || !dateRange?.from || !dateRange?.to) {
      toast.error('Dados não disponíveis para exportação');
      return;
    }

    const reportData: ReportData = {
      totalIncome: transactionData.totalIncome,
      totalExpenses: transactionData.totalExpenses,
      balance: transactionData.balance,
      savingsRate: transactionData.savingsRate,
      transactions: transactionData.transactions,
      dateRange: {
        from: format(dateRange.from, 'dd/MM/yyyy'),
        to: format(dateRange.to, 'dd/MM/yyyy')
      }
    };

    exportToCSV(reportData);
    toast.success('Relatório CSV exportado com sucesso!');
  };

  const handleExportPDF = () => {
    if (!transactionData || !dateRange?.from || !dateRange?.to) {
      toast.error('Dados não disponíveis para exportação');
      return;
    }

    const reportData: ReportData = {
      totalIncome: transactionData.totalIncome,
      totalExpenses: transactionData.totalExpenses,
      balance: transactionData.balance,
      savingsRate: transactionData.savingsRate,
      transactions: transactionData.transactions,
      dateRange: {
        from: format(dateRange.from, 'dd/MM/yyyy'),
        to: format(dateRange.to, 'dd/MM/yyyy')
      }
    };

    exportToPDF(reportData);
    toast.success('Relatório PDF gerado com sucesso!');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando relatórios...</div>
        </div>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <p className="text-gray-600 dark:text-gray-400">Análise detalhada das suas finanças</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de relatório" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Relatório Mensal</SelectItem>
                  <SelectItem value="quarterly">Relatório Trimestral</SelectItem>
                  <SelectItem value="yearly">Relatório Anual</SelectItem>
                  <SelectItem value="category">Por Categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <DatePickerWithRange 
                date={dateRange}
                onDateChange={handleDateRangeChange}
              />
            </div>
            <Button>
              <BarChart3 className="mr-2 h-4 w-4" />
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {transactionData?.totalIncome?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {transactionData?.totalExpenses?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Economia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(transactionData?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {transactionData?.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Poupança</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {transactionData?.savingsRate?.toFixed(1) || '0,0'}%
            </div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Visão Mensal - Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transactionData?.monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="income" fill="#10b981" name="Receitas" />
                <Bar dataKey="expenses" fill="#ef4444" name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={transactionData?.categoryData || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(transactionData?.categoryData || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Economia</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={transactionData?.trendData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
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
    </div>
  );
};

export default Reports;
