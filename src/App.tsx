
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { MobileAppLayout } from "@/components/mobile/MobileAppLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SEOHead } from "@/components/SEOHead";
import { shouldUseMobileLayout } from "@/hooks/useMobileDetection";
import React from "react";

// Regular pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Goals from "./pages/Goals";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Scheduled from "./pages/Scheduled";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminCategories from "./pages/admin/Categories";
import AdminSettings from "./pages/admin/Settings";
import AdminReports from "./pages/admin/Reports";
import AdminNotifications from "./pages/admin/Notifications";
import AdminSystem from "./pages/admin/System";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminAPI from "./pages/admin/API";

const queryClient = new QueryClient();

// Componente para escolher o layout baseado no dispositivo
const LayoutWrapper = () => {
  const useMobile = shouldUseMobileLayout();
  
  // Força refresh Android se necessário
  React.useEffect(() => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const appVersion = localStorage.getItem('app-version');
    const currentVersion = 'v6-force-android';
    
    if (isAndroid && appVersion !== currentVersion) {
      console.log('🔥 ANDROID: Forçando refresh completo');
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('app-version', currentVersion);
      
      // Force service worker update
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.update();
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }
      
      // Force reload em 1 segundo
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, []);
  
  console.log('🎯 LayoutWrapper v6 ANDROID FORCE:', { 
    useMobile, 
    userAgent: navigator.userAgent.substring(0, 50) + '...',
    screenWidth: window.innerWidth,
    isAndroid: /android/i.test(navigator.userAgent),
    href: window.location.href 
  });
  
  if (useMobile) {
    console.log('📱 Usando MobileAppLayout (ÚNICO LAYOUT MOBILE)');
    return <MobileAppLayout />;
  }
  
  console.log('💻 Usando AppLayout (Desktop)');
  return <AppLayout />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <SEOHead />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Protected routes with responsive layout and subscription guard */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <SubscriptionGuard>
                    <LayoutWrapper />
                  </SubscriptionGuard>
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="transactions/*" element={<Transactions />} />
                <Route path="categories" element={<Categories />} />
                <Route path="goals/*" element={<Goals />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="scheduled" element={<Scheduled />} />
              </Route>

              {/* Admin routes with AdminLayout without subscription guard */}
              <Route path="/admin/*" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="system" element={<AdminSystem />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="api" element={<AdminAPI />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Route>

              {/* Fallback routes */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
