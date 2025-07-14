
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransactionStatsProps {
  transactions: any[];
  dateRange?: { from?: Date; to?: Date } | undefined;
}

export const TransactionStats = ({ transactions, dateRange }: TransactionStatsProps) => {
  const stats = React.useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const balance = totalIncome - totalExpense;
    const transactionCount = transactions.length;
    
    return {
      totalIncome,
      totalExpense,
      balance,
      transactionCount
    };
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return `R$ ${Math.abs(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getPeriodInfo = () => {
    const currentMonth = new Date();
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Se não há filtro de data ou é exatamente o mês atual
    if (!dateRange?.from || !dateRange?.to || 
        (dateRange.from.getTime() === currentMonthStart.getTime() && 
         dateRange.to.getTime() === currentMonthEnd.getTime())) {
      return {
        title: format(new Date(), 'MMMM yyyy', { locale: ptBR }),
        subtitle: 'Dados do mês atual'
      };
    }
    
    // Se é um período personalizado
    const isSameMonth = dateRange.from.getMonth() === dateRange.to.getMonth() && 
                       dateRange.from.getFullYear() === dateRange.to.getFullYear();
    
    if (isSameMonth && dateRange.from.getDate() === 1) {
      // É um mês completo
      return {
        title: format(dateRange.from, 'MMMM yyyy', { locale: ptBR }),
        subtitle: 'Dados do mês selecionado'
      };
    } else {
      // É um período personalizado
      return {
        title: 'Período Personalizado',
        subtitle: `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
      };
    }
  };

  const periodInfo = getPeriodInfo();

  return (
    <div className="space-y-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Período de Referência</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold capitalize">{periodInfo.title}</div>
          <p className="text-xs text-muted-foreground">
            {periodInfo.subtitle}
          </p>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.transactionCount}</div>
          <p className="text-xs text-muted-foreground">
            transações encontradas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Receitas</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalIncome)}
          </div>
          <p className="text-xs text-muted-foreground">
            em receitas no período
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(stats.totalExpense)}
          </div>
          <p className="text-xs text-muted-foreground">
            em despesas no período
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          {stats.balance >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            stats.balance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stats.balance >= 0 ? '+' : ''}{formatCurrency(stats.balance)}
          </div>
          <p className="text-xs text-muted-foreground">
            saldo no período
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
