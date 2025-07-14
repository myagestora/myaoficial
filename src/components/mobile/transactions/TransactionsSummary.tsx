import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransactionsSummaryProps {
  income: number;
  expenses: number;
  formatCurrency: (value: number) => string;
  dateRange?: { from?: Date; to?: Date } | undefined;
}

export const TransactionsSummary = ({ income, expenses, formatCurrency, dateRange }: TransactionsSummaryProps) => {
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
    <div className="space-y-3 mb-4">
      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Período de Referência</p>
              <p className="text-sm font-semibold text-foreground capitalize">{periodInfo.title}</p>
              <p className="text-xs text-muted-foreground">{periodInfo.subtitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-2 gap-3">
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-green-700">Receitas</p>
              <p className="text-sm font-semibold text-green-800">{formatCurrency(income)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-red-700">Despesas</p>
              <p className="text-sm font-semibold text-red-800">{formatCurrency(expenses)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};