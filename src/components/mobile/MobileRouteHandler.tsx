import React from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const path = location.pathname;

  // Mapear rotas para componentes mobile otimizados
  if (path === '/dashboard') {
    return <MobileDashboard />;
  } else if (path === '/transactions') {
    return <MobileTransactions />;
  } else if (path === '/transactions/nova') {
    return <MobileTransactionForm />;
  } else if (path.startsWith('/transactions/editar/')) {
    return <MobileTransactionForm />;
  } else if (path === '/goals') {
    return <MobileGoals />;
  } else if (path === '/goals/nova') {
    return <MobileGoalForm />;
  } else if (path.startsWith('/goals/editar/')) {
    return <MobileGoalForm />;
  } else if (path === '/reports') {
    return <MobileReports />;
  } else if (path === '/settings') {
    return <MobileSettings />;
  } else if (path === '/scheduled') {
    return <MobileScheduled />;
  } else if (path === '/categories') {
    return <MobileCategories />;
  } else {
    return <MobileDashboard />; // Fallback para dashboard
  }
};