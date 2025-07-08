
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import IndexPage from '@/pages/Index';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import SettingsPage from '@/pages/Settings';
import SubscriptionPage from '@/pages/Subscription';
import SubscriptionSuccess from '@/pages/subscription/Success';
import SubscriptionFailure from '@/pages/subscription/Failure';

function App() {
  return (
    <>
      <SEOHead />
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Rotas protegidas com layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            <Route path="/subscription/failure" element={<SubscriptionFailure />} />
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default App;
