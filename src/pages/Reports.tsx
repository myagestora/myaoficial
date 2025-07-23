import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportToCSV, exportToPDF, ReportData, TransactionData } from '@/utils/exportUtils';
import { toast } from 'sonner';
import { GoalsSection } from '@/components/reports/GoalsSection';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { ModernCard } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { CreditCardReportsBlockDesktop } from '@/components/reports/CreditCardReportsBlockDesktop';
import { CategoryReportsBlockDesktop } from '@/components/reports/CategoryReportsBlockDesktop';
import { ComparativeTrendsBlockDesktop } from '@/components/reports/ComparativeTrendsBlockDesktop';
import { GoalsReportsBlockDesktop } from '@/components/reports/GoalsReportsBlockDesktop';
import { useGoals } from '@/hooks/useGoals';
import { RecurringReportsBlockDesktop } from '@/components/reports/RecurringReportsBlockDesktop';
import { AlertsInsightsBlock } from '@/components/reports/AlertsInsightsBlock';

const Reports = () => {
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

  const { bankAccounts, isLoading: loadingAccounts } = useBankAccounts();
  const { transactions, isLoading: loadingTransactions } = useTransactions();
  const { goals, isLoadingGoals } = useGoals();

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

  const handleExportPDF = async () => {
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

    try {
      await exportToPDF(reportData);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar o relatório PDF');
    }
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header padrão */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-2">Relatórios</h1>
          <p className="text-base md:text-lg text-muted-foreground">Análise detalhada das suas finanças</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportCSV} className="md:px-4 px-2">
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Exportar CSV</span>
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="md:px-4 px-2">
            <FileText className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Exportar PDF</span>
          </Button>
        </div>
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <PeriodFilter 
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ModernCard
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          iconBgColor="#DCFCE7"
          title="Receita Total"
          value={`R$ ${transactionData?.totalIncome?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
          valueColor="text-green-600"
          description="No período selecionado"
        />
        <ModernCard
          icon={<TrendingDown className="h-6 w-6 text-red-600" />}
          iconBgColor="#FEE2E2"
          title="Despesa Total"
          value={`R$ ${transactionData?.totalExpenses?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
          valueColor="text-red-600"
          description="No período selecionado"
        />
        <ModernCard
          icon={<DollarSign className={`h-6 w-6 ${(transactionData?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />}
          iconBgColor="#E0F2FE"
          title="Economia"
          value={`R$ ${transactionData?.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
          valueColor={(transactionData?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          description="No período selecionado"
        />
        <ModernCard
          icon={<PiggyBank className="h-6 w-6 text-purple-600" />}
          iconBgColor="#EDE9FE"
          title="Taxa de Poupança"
          value={`${transactionData?.savingsRate?.toFixed(1) || '0,0'}%`}
          valueColor="text-purple-600"
          description="No período selecionado"
        />
      </div>

      {/* Bloco de Contas e Cartões de Crédito lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
              Contas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingAccounts || loadingTransactions ? (
              <div className="text-center text-xs text-gray-400">Carregando contas...</div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-center text-xs text-gray-400">Nenhuma conta cadastrada</div>
            ) : (
              bankAccounts.map((account) => {
                // Entradas e saídas por conta
                const entradas = transactions.filter(t => t.account_id === account.id && t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
                const saidas = transactions.filter(t => t.account_id === account.id && t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
                const movimentacao = entradas + saidas;
                // Saldo real: saldo inicial + entradas - saídas
                const saldoReal = (account.balance || 0) + entradas - saidas;
                // Conta mais movimentada
                const maxMov = Math.max(...bankAccounts.map(acc => {
                  const ent = transactions.filter(t => t.account_id === acc.id && t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
                  const sai = transactions.filter(t => t.account_id === acc.id && t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
                  return ent + sai;
                }));
                const isMost = movimentacao === maxMov && movimentacao > 0;
                return (
                  <div key={account.id} className={`rounded-lg border p-2 flex flex-col gap-1 ${isMost ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: account.color }} />
                      <span className="font-semibold text-sm text-gray-900 truncate flex-1">{account.name}</span>
                      {isMost && <span className="text-xs text-blue-700 font-bold ml-2">+ movimentada</span>}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Tipo: {account.type === 'checking' ? 'Corrente' : account.type === 'savings' ? 'Poupança' : 'Investimento'}</span>
                      <span>Saldo: <span className="font-medium text-gray-700">{saldoReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Entradas: <span className="font-medium text-green-700">{entradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></span>
                      <span>Saídas: <span className="font-medium text-red-700">{saidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        <CreditCardReportsBlockDesktop dateRange={dateRange} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard className="h-full">
          <div className="mb-2 font-semibold text-lg">Visão Mensal - Receitas vs Despesas</div>
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
        </ModernCard>
        <CategoryReportsBlockDesktop transactionData={transactionData} isLoading={isLoading} />
      </div>

      {/* Bloco de Comparativos e Tendências */}
      <ComparativeTrendsBlockDesktop transactionData={transactionData} isLoading={isLoading} />

      {/* Bloco de Relatórios de Metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <GoalsReportsBlockDesktop goalsData={goals} isLoading={isLoadingGoals} />
        <RecurringReportsBlockDesktop />
      </div>
    </div>
  );
};

export default Reports;
