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

export const MobileReports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const categories = [
    { name: 'Alimentação', amount: 1250.00, percentage: 35, color: '#F44336' },
    { name: 'Transporte', amount: 850.00, percentage: 24, color: '#2196F3' },
    { name: 'Saúde', amount: 650.00, percentage: 18, color: '#4CAF50' },
    { name: 'Lazer', amount: 450.00, percentage: 13, color: '#FF9800' },
    { name: 'Outros', amount: 350.00, percentage: 10, color: '#9C27B0' }
  ];

  const monthlyData = [
    { month: 'Out', income: 8500, expense: 3200 },
    { month: 'Nov', income: 8500, expense: 3800 },
    { month: 'Dez', income: 9200, expense: 4100 },
    { month: 'Jan', income: 8500, expense: 3550 }
  ];

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
                <p className="text-lg font-bold text-green-800">{formatCurrency(8500)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-green-600 mt-2">+5% vs mês anterior</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 mb-1">Total Despesas</p>
                <p className="text-lg font-bold text-red-800">{formatCurrency(3550)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xs text-red-600 mt-2">+12% vs mês anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Saldo líquido */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saldo Líquido</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(4950)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Economia de 58% da sua renda
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
          {categories.map((category, index) => (
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
          ))}
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