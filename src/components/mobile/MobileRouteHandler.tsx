import React from 'react';
import { useLocation } from 'react-router-dom';
import { MobileDashboard } from './pages/MobileDashboard';
import { MobileTransactions } from './pages/MobileTransactions';
import { MobileGoals } from './pages/MobileGoals';
import { MobileReports } from './pages/MobileReports';
import { MobileScheduled } from './pages/MobileScheduled';
import { MobileCategories } from './pages/MobileCategories';
import { MobileSettings } from './pages/MobileSettings';

export const MobileRouteHandler = () => {
  const location = useLocation();
  const path = location.pathname;

  // Mapear rotas para componentes mobile otimizados
  switch (path) {
    case '/dashboard':
      return <MobileDashboard />;
    case '/transactions':
      return <MobileTransactions />;
    case '/goals':
      return <MobileGoals />;
    case '/reports':
      return <MobileReports />;
    case '/settings':
      return <MobileSettings />;
    case '/scheduled':
      return <MobileScheduled />;
    case '/categories':
      return <MobileCategories />;
    default:
      return <MobileDashboard />; // Fallback para dashboard
  }
};