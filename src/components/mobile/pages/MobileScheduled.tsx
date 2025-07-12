import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  Repeat,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useScheduledTransactions } from '@/hooks/useScheduledTransactions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const MobileScheduled = () => {
  const { scheduledTransactions, isLoading } = useScheduledTransactions();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  const formatFrequency = (frequency: string) => {
    const frequencies: Record<string, string> = {
      daily: 'Diária',
      weekly: 'Semanal',
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    };
    return frequencies[frequency] || frequency;
  };

  if (isLoading) {
    return (
      <MobilePageWrapper>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Calendar className="h-6 w-6 mr-2" />
          Agendadas
        </h1>
        <Button size="sm" className="flex items-center space-x-2">
          <Plus size={16} />
          <span>Nova</span>
        </Button>
      </div>

      {/* Resumo */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo de Transações Agendadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{scheduledTransactions?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {scheduledTransactions?.filter(t => t.is_recurring)?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Ativas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de transações agendadas */}
      <div className="space-y-3">
        {scheduledTransactions?.map((transaction) => (
          <Card key={transaction.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header da transação */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      <Repeat size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.title}</p>
                      <p className="text-xs text-muted-foreground">{transaction.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>

                {/* Informações de agendamento */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Clock size={10} />
                      <span>{formatFrequency(transaction.recurrence_frequency || '')}</span>
                    </Badge>
                    {transaction.next_recurrence_date && (
                      <span className="text-muted-foreground flex items-center">
                        <Calendar size={10} className="mr-1" />
                        Próxima: {format(new Date(transaction.next_recurrence_date), 'dd/MM', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <Badge 
                    variant={transaction.is_recurring ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {transaction.is_recurring ? 'Ativa' : 'Pausada'}
                  </Badge>
                </div>

                {/* Ações */}
                <div className="flex space-x-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit size={14} className="mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    {transaction.is_recurring ? <Pause size={14} /> : <Play size={14} />}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {scheduledTransactions?.length === 0 && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">Nenhuma transação agendada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie transações recorrentes para automatizar seu controle financeiro
            </p>
            <Button>
              <Plus size={16} className="mr-2" />
              Criar primeira transação agendada
            </Button>
          </CardContent>
        </Card>
      )}
    </MobilePageWrapper>
  );
};