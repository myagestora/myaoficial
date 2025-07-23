import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Repeat, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const recurrenceLabel = (rec: any) => {
  if (rec.recurrence_frequency === 'monthly') return 'Mensal';
  if (rec.recurrence_frequency === 'weekly') return 'Semanal';
  if (rec.recurrence_frequency === 'yearly') return 'Anual';
  if (rec.recurrence_frequency === 'custom') return `A cada ${rec.recurrence_interval || 1} dias`;
  return 'Personalizada';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const RecurringReportsBlock: React.FC = () => {
  const { user } = useAuth();
  const { data: recTransactions, isLoading } = useQuery({
    queryKey: ['recurring-reports-mobile', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('transactions')
        .select(`*, categories (name, color, type)`)
        .eq('user_id', user.id)
        .eq('is_recurring', true);
      const { data, error } = await query.order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Recorrências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Carregando recorrências...</div>
        </CardContent>
      </Card>
    );
  }

  if (!recTransactions || recTransactions.length === 0) {
    return (
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">Recorrências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-xs text-gray-400">Nenhuma recorrência encontrada</div>
        </CardContent>
      </Card>
    );
  }

  const incomeRec = recTransactions.filter((t: any) => t.type === 'income');
  const expenseRec = recTransactions.filter((t: any) => t.type === 'expense');

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">Recorrências</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {incomeRec.length > 0 && (
          <div>
            <div className="font-semibold text-xs text-green-700 mb-1">Receitas Recorrentes</div>
            {incomeRec.map((t: any) => (
              <div key={t.id} className="border rounded-lg p-3 mb-2 bg-green-50/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-green-600" /> {t.title}
                  </span>
                  <Badge className="bg-green-100 text-green-700 border-green-200">{recurrenceLabel(t)}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3 text-green-600" /> {formatCurrency(t.amount)}
                  {t.categories && (
                    <span className="ml-2 flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.categories.color }} /> {t.categories.name}</span>
                  )}
                </div>
                {t.next_recurrence_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" /> Próxima: {formatDate(t.next_recurrence_date)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {expenseRec.length > 0 && (
          <div>
            <div className="font-semibold text-xs text-red-700 mb-1">Despesas Recorrentes</div>
            {expenseRec.map((t: any) => (
              <div key={t.id} className="border rounded-lg p-3 mb-2 bg-red-50/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-red-600" /> {t.title}
                  </span>
                  <Badge className="bg-red-100 text-red-700 border-red-200">{recurrenceLabel(t)}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingDown className="w-3 h-3 text-red-600" /> {formatCurrency(t.amount)}
                  {t.categories && (
                    <span className="ml-2 flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.categories.color }} /> {t.categories.name}</span>
                  )}
                </div>
                {t.next_recurrence_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" /> Próxima: {formatDate(t.next_recurrence_date)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 