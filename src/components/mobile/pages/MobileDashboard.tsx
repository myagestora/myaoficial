import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Plus,
  Eye,
  EyeOff,
  CreditCard
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const MobileDashboard = () => {
  const [showValues, setShowValues] = useState(true);
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    if (!showValues) return '****';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <MobilePageWrapper>
      {/* Header com saldo */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Saldo Total</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowValues(!showValues)}
            >
              {showValues ? <Eye size={14} /> : <EyeOff size={14} />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(5432.10)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            +2.5% em relação ao mês passado
          </p>
        </CardContent>
      </Card>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          className="h-16 flex-col space-y-1"
          onClick={() => navigate('/transactions')}
        >
          <Plus size={20} />
          <span className="text-xs">Nova Transação</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex-col space-y-1"
          onClick={() => navigate('/reports')}
        >
          <CreditCard size={20} />
          <span className="text-xs">Ver Relatórios</span>
        </Button>
      </div>

      {/* Resumo mensal */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(8500.00)}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold text-red-600">
              {formatCurrency(3067.90)}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Metas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Metas do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Delivery</span>
              <span className="text-sm text-muted-foreground">0% de R$ 200</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => navigate('/goals')}
          >
            Ver todas as metas
          </Button>
        </CardContent>
      </Card>

      {/* Transações recentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <DollarSign size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Supermercado</p>
                  <p className="text-xs text-muted-foreground">Hoje, 14:30</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600">-R$ 89,50</p>
              </div>
            </div>
          ))}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={() => navigate('/transactions')}
          >
            Ver todas as transações
          </Button>
        </CardContent>
      </Card>
    </MobilePageWrapper>
  );
};