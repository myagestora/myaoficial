import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, TrendingUp, TrendingDown, DollarSign, PiggyBank, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportToCSV, exportToPDF, ReportData, TransactionData } from '@/utils/exportUtils';
import { toast } from '@/hooks/use-toast';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { CreditCardReportsBlock } from './CreditCardReportsBlock';
import { CategoryReportsBlock } from './CategoryReportsBlock';
import { ComparativeTrendsBlock } from './ComparativeTrendsBlock';
import { GoalsReportsBlock } from './GoalsReportsBlock';
import { RecurringReportsBlock } from './RecurringReportsBlock';

export const MobileReports = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const { data: transactionData, isLoading } = useQuery({
    queryKey: ['mobile-reports-transactions', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`*, categories (name, color, type)`)
        .gte('date', dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd'))
        .lte('date', dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(endOfMonth(new Date()), 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      if (error) throw error;

      const totalIncome = data.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpenses = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const balance = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
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
      const categoryData = data.filter(t => t.type === 'expense').reduce((acc: any, transaction) => {
        const categoryName = transaction.categories?.name || 'Sem categoria';
        const categoryColor = transaction.categories?.color || '#8884d8';
        if (!acc[categoryName]) {
          acc[categoryName] = { name: categoryName, value: 0, color: categoryColor };
        }
        acc[categoryName].value += Number(transaction.amount);
        return acc;
      }, {});
      const trendData = Object.values(monthlyData).map((item: any) => ({
        month: item.month,
        value: item.balance
      }));
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

  return (
    <div className="max-w-2xl mx-auto p-2 space-y-4">
      {/* Header padrão mobile */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Relatórios</h1>
          <p className="text-[11px] text-gray-400">Análise detalhada das suas finanças</p>
        </div>
        <div className="ml-auto flex gap-1">
          <Button variant="outline" size="icon" onClick={handleExportCSV} className="border-primary/20"><Download size={16} /></Button>
          <Button variant="outline" size="icon" onClick={handleExportPDF} className="border-primary/20"><FileText size={16} /></Button>
        </div>
      </div>
      {/* Filtro de período - sem Card */}
      <div className="mb-2">
        <PeriodFilter
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-3 py-2 flex flex-col items-center min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-5 h-5 text-green-600 bg-green-50 rounded p-1" />
            <span className="text-xs text-gray-500 font-medium">Receitas</span>
          </div>
          <span className="text-base font-bold text-green-700 text-center whitespace-nowrap">{transactionData.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-3 py-2 flex flex-col items-center min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-5 h-5 text-red-600 bg-red-50 rounded p-1" />
            <span className="text-xs text-gray-500 font-medium">Despesas</span>
          </div>
          <span className="text-base font-bold text-red-700 text-center whitespace-nowrap">{transactionData.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-3 py-2 flex flex-col items-center min-w-0 col-span-2">
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="w-5 h-5 text-blue-600 bg-blue-50 rounded p-1" />
            <span className="text-xs text-gray-500 font-medium">Saldo Líquido</span>
          </div>
          <span className={`text-base font-bold ${transactionData.balance >= 0 ? 'text-blue-700' : 'text-red-700'} text-center whitespace-nowrap`}>{transactionData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          <span className="text-[11px] text-gray-400 mt-1">Taxa de Poupança: {transactionData.savingsRate.toFixed(1)}%</span>
        </div>
      </div>

      {/* Bloco de Cartões de Crédito */}
      <CreditCardReportsBlock dateRange={dateRange} />

      {/* Bloco de Categorias */}
      <CategoryReportsBlock transactions={transactionData.transactions} />

      {/* Bloco de Comparativos e Tendências */}
      <ComparativeTrendsBlock reportData={transactionData} />

      {/* Bloco de Relatórios de Metas */}
      <GoalsReportsBlock transactions={transactionData.transactions} />

      {/* Bloco de Relatórios de Recorrências */}
      <RecurringReportsBlock transactions={transactionData.transactions} />
    </div>
  );
}; 