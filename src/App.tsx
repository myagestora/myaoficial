
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import IndexPage from '@/pages/Index';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import TransactionsPage from '@/pages/Transactions';
import CategoriesPage from '@/pages/Categories';
import GoalsPage from '@/pages/Goals';
import ReportsPage from '@/pages/Reports';
import ScheduledPage from '@/pages/Scheduled';
import SettingsPage from '@/pages/Settings';
import SubscriptionPage from '@/pages/Subscription';
import SubscriptionSuccess from '@/pages/subscription/Success';
import SubscriptionFailure from '@/pages/subscription/Failure';

// Admin pages
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';
import AdminReports from '@/pages/admin/Reports';
import AdminSubscriptions from '@/pages/admin/Subscriptions';
import AdminNotifications from '@/pages/admin/Notifications';
import AdminSystem from '@/pages/admin/System';
import AdminSettings from '@/pages/admin/Settings';
import AdminCategories from '@/pages/admin/Categories';

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
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/scheduled" element={<ScheduledPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            <Route path="/subscription/failure" element={<SubscriptionFailure />} />
          </Route>

          {/* Rotas de admin protegidas */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/system" element={<AdminSystem />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default App;
