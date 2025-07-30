
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertsInsightsBlock } from '@/components/reports/AlertsInsightsBlock';
import { CategoryReportsBlockDesktop } from '@/components/reports/CategoryReportsBlockDesktop';
import { ComparativeTrendsBlockDesktop } from '@/components/reports/ComparativeTrendsBlockDesktop';
import { CreditCardReportsBlockDesktop } from '@/components/reports/CreditCardReportsBlockDesktop';
import { GoalsReportsBlockDesktop } from '@/components/reports/GoalsReportsBlockDesktop';
import { RecurringReportsBlockDesktop } from '@/components/reports/RecurringReportsBlockDesktop';
import { CartRecoveryAnalytics } from '@/components/admin/CartRecoveryAnalytics';

const AdminReports = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relatórios e Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">Visualize métricas e insights do sistema</p>
      </div>

      <Tabs defaultValue="cart-recovery" className="space-y-6">
        <TabsList>
          <TabsTrigger value="cart-recovery">Recuperação de Carrinho</TabsTrigger>
          <TabsTrigger value="alerts">Alertas e Insights</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="credit-cards">Cartões de Crédito</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
        </TabsList>

        <TabsContent value="cart-recovery" className="space-y-6">
          <CartRecoveryAnalytics />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsInsightsBlock />
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <CategoryReportsBlockDesktop />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <ComparativeTrendsBlockDesktop />
        </TabsContent>

        <TabsContent value="credit-cards" className="space-y-6">
          <CreditCardReportsBlockDesktop />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalsReportsBlockDesktop />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6">
          <RecurringReportsBlockDesktop />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReports;
