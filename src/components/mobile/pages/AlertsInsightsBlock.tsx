import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Info, Calendar } from 'lucide-react';

interface AlertsInsightsBlockProps {
  reportData: any;
  goalsData: any[];
  transactions: any[];
}

export const AlertsInsightsBlock: React.FC<AlertsInsightsBlockProps> = ({ reportData, goalsData, transactions }) => {
  React.useEffect(() => {
    // Log temporário para depuração
    if (reportData && Array.isArray(reportData.categoryData)) {
      console.log('categoryData (mobile):', reportData.categoryData);
    }
  }, [reportData]);
  // Alertas
  const alerts: { icon: React.ReactNode; text: string; color: string }[] = [];
  // Meta excedida
  if (goalsData && goalsData.length > 0) {
    goalsData.forEach(goal => {
      if (goal.status === 'exceeded') {
        alerts.push({
          icon: <AlertTriangle className="w-4 h-4 text-red-600" />, text: `Meta excedida: ${goal.title}`, color: 'text-red-700'
        });
      }
    });
  }
  // Saldo negativo
  if (reportData && reportData.balance < 0) {
    alerts.push({
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />, text: 'Seu saldo está negativo!', color: 'text-red-700'
    });
  }
  // Recorrência atrasada
  if (transactions && transactions.length > 0) {
    const now = new Date();
    transactions.forEach(t => {
      if (t.is_recurring && t.next_recurrence_date) {
        const next = new Date(t.next_recurrence_date + 'T00:00:00Z');
        if (next < now) {
          alerts.push({
            icon: <AlertTriangle className="w-4 h-4 text-orange-600" />, text: `Recorrência atrasada: ${t.title}`, color: 'text-orange-700'
          });
        }
      }
    });
  }

  // Insights
  const insights: { icon: React.ReactNode; text: string; color: string }[] = [];
  // Tendência de aumento de despesas
  if (reportData && reportData.monthlyData && reportData.monthlyData.length > 2) {
    const last = reportData.monthlyData[reportData.monthlyData.length - 1];
    const prev = reportData.monthlyData[reportData.monthlyData.length - 2];
    if (last.expenses > prev.expenses) {
      insights.push({
        icon: <TrendingUp className="w-4 h-4 text-red-600" />, text: 'Despesas aumentaram em relação ao mês anterior', color: 'text-red-700'
      });
    } else if (last.expenses < prev.expenses) {
      insights.push({
        icon: <TrendingDown className="w-4 h-4 text-green-600" />, text: 'Despesas diminuíram em relação ao mês anterior', color: 'text-green-700'
      });
    }
  }
  // Categoria mais usada (padronizado)
  if (reportData && Array.isArray(reportData.categoryData) && reportData.categoryData.length > 0) {
    const sortedCats = [...reportData.categoryData].sort((a, b) => b.value - a.value);
    const topCat = sortedCats[0];
    if (topCat && topCat.name) {
      insights.push({
        icon: <Info className="w-4 h-4 text-blue-600" />, text: `Categoria mais usada: ${topCat.name}`, color: 'text-blue-700'
      });
    }
  }
  // Meta próxima de exceder (acima de 90%)
  if (goalsData && goalsData.length > 0) {
    goalsData.forEach(goal => {
      if (goal.status !== 'exceeded' && goal.usagePercentage && goal.usagePercentage >= 90) {
        alerts.push({
          icon: <AlertTriangle className="w-4 h-4 text-orange-600" />, text: `Meta quase excedida: ${goal.title}`, color: 'text-orange-700'
        });
      }
      if (goal.status !== 'completed' && goal.progressPercentage && goal.progressPercentage >= 90) {
        insights.push({
          icon: <CheckCircle className="w-4 h-4 text-green-600" />, text: `Meta próxima de ser atingida: ${goal.title}`, color: 'text-green-700'
        });
      }
    });
  }
  // Saldo muito baixo
  if (reportData && reportData.balance >= 0 && reportData.balance < 100) {
    alerts.push({
      icon: <AlertTriangle className="w-4 h-4 text-orange-600" />, text: 'Seu saldo está muito baixo!', color: 'text-orange-700'
    });
  }
  // Despesa incomum (valor muito acima da média da categoria)
  if (transactions && transactions.length > 0) {
    const catSums: Record<string, number[]> = {};
    transactions.forEach(t => {
      if (t.type === 'expense' && t.categories?.name) {
        if (!catSums[t.categories.name]) catSums[t.categories.name] = [];
        catSums[t.categories.name].push(Number(t.amount));
      }
    });
    Object.entries(catSums).forEach(([cat, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      if (max > avg * 2 && max > 100) {
        alerts.push({
          icon: <AlertTriangle className="w-4 h-4 text-orange-600" />, text: `Despesa incomum em ${cat}: R$ ${max.toFixed(2)}`, color: 'text-orange-700'
        });
      }
    });
  }
  // Receita incomum
  if (transactions && transactions.length > 0) {
    const catSums: Record<string, number[]> = {};
    transactions.forEach(t => {
      if (t.type === 'income' && t.categories?.name) {
        if (!catSums[t.categories.name]) catSums[t.categories.name] = [];
        catSums[t.categories.name].push(Number(t.amount));
      }
    });
    Object.entries(catSums).forEach(([cat, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      if (max > avg * 2 && max > 100) {
        insights.push({
          icon: <TrendingUp className="w-4 h-4 text-green-600" />, text: `Receita incomum em ${cat}: R$ ${max.toFixed(2)}`, color: 'text-green-700'
        });
      }
    });
  }
  // Muitas transações em um mesmo dia
  if (transactions && transactions.length > 0) {
    const dayCounts: Record<string, number> = {};
    transactions.forEach(t => {
      const d = t.date;
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    Object.entries(dayCounts).forEach(([d, count]) => {
      if (count >= 10) {
        alerts.push({
          icon: <AlertTriangle className="w-4 h-4 text-orange-600" />, text: `Muitas transações em ${d}: ${count}`, color: 'text-orange-700'
        });
      }
    });
  }
  // Categoria com maior crescimento de despesas
  if (reportData && reportData.monthlyData && reportData.monthlyData.length > 2) {
    const last = reportData.monthlyData[reportData.monthlyData.length - 1];
    const prev = reportData.monthlyData[reportData.monthlyData.length - 2];
    if (last.expenses > prev.expenses) {
      if (reportData.categoryData && reportData.categoryData.length > 0) {
        const topCat = reportData.categoryData.reduce((a, b) => (a.value > b.value ? a : b));
        insights.push({
          icon: <TrendingUp className="w-4 h-4 text-red-600" />, text: `Maior crescimento de despesas: ${topCat.name}`, color: 'text-red-700'
        });
      }
    }
  }
  // Dica de economia
  if (reportData && reportData.totalExpenses > 0 && reportData.totalIncome > 0 && reportData.totalExpenses > 0.8 * reportData.totalIncome) {
    insights.push({
      icon: <Info className="w-4 h-4 text-purple-600" />, text: 'Suas despesas estão acima de 80% das receitas. Reveja seus gastos!', color: 'text-purple-700'
    });
  }

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">Alertas e Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 && insights.length === 0 && (
          <div className="text-xs text-gray-400">Nenhum alerta ou insight relevante para o período.</div>
        )}
        {alerts.length > 0 && (
          <div>
            <div className="font-semibold text-xs text-red-700 mb-1">Alertas</div>
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 py-1 px-2 rounded ${a.color} bg-red-50/40 mb-1`}>
                {a.icon}
                <span className="text-xs flex-1 truncate">{a.text}</span>
              </div>
            ))}
          </div>
        )}
        {insights.length > 0 && (
          <div>
            <div className="font-semibold text-xs text-blue-700 mb-1 mt-2">Insights</div>
            {insights.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 py-1 px-2 rounded ${a.color} bg-blue-50/40 mb-1`}>
                {a.icon}
                <span className="text-xs flex-1 truncate">{a.text}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 