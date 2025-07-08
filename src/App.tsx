import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SEOHead from '@/components/SEOHead';
import ProtectedRoute from '@/components/ProtectedRoute';
import HomePage from '@/pages/Home';
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
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          {/* Subscription routes */}
          <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
          <Route path="/subscription/success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />
          <Route path="/subscription/failure" element={<ProtectedRoute><SubscriptionFailure /></ProtectedRoute>} />

          {/* Add other routes here as needed */}
        </Routes>
      </div>
    </>
  );
}

export default App;
