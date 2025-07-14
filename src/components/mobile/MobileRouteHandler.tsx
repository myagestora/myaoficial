import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MobileDashboard } from './pages/MobileDashboard';
import { MobileTransactions } from './pages/MobileTransactions';
import { MobileTransactionForm } from './pages/MobileTransactionForm';
import { MobileGoals } from './pages/MobileGoals';
import { MobileGoalForm } from './pages/MobileGoalForm';
import { MobileReports } from './pages/MobileReports';
import { MobileScheduled } from './pages/MobileScheduled';
import { MobileCategories } from './pages/MobileCategories';
import { MobileSettings } from './pages/MobileSettings';

export const MobileRouteHandler = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<MobileDashboard />} />
      <Route path="transactions" element={<MobileTransactions />} />
      <Route path="transactions/nova" element={<MobileTransactionForm />} />
      <Route path="transactions/editar/:id" element={<MobileTransactionForm />} />
      <Route path="goals" element={<MobileGoals />} />
      <Route path="goals/nova" element={<MobileGoalForm />} />
      <Route path="goals/editar/:id" element={<MobileGoalForm />} />
      <Route path="reports" element={<MobileReports />} />
      <Route path="settings" element={<MobileSettings />} />
      <Route path="scheduled" element={<MobileScheduled />} />
      <Route path="categories" element={<MobileCategories />} />
      <Route path="*" element={<MobileDashboard />} />
    </Routes>
  );
};