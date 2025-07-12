import React from 'react';
import { useLocation } from 'react-router-dom';
import { MobileDashboard } from './pages/MobileDashboard';
import { MobileTransactions } from './pages/MobileTransactions';
import { MobileGoals } from './pages/MobileGoals';
import { MobileReports } from './pages/MobileReports';

// Importações das páginas padrão para reutilizar a lógica
import Settings from '@/pages/Settings';
import Scheduled from '@/pages/Scheduled';
import Categories from '@/pages/Categories';

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
      return <Settings />; // Usando o componente original por enquanto
    case '/scheduled':
      return <Scheduled />; // Usando o componente original por enquanto
    case '/categories':
      return <Categories />; // Usando o componente original por enquanto
    default:
      return <MobileDashboard />; // Fallback para dashboard
  }
};