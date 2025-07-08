
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useSEOConfig } from "./hooks/useSEOConfig";
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Goals from "./pages/Goals";
import Scheduled from "./pages/Scheduled";
import Categories from "./pages/Categories";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";
import AdminCategories from "./pages/admin/Categories";
import AdminReports from "./pages/admin/Reports";
import AdminSystem from "./pages/admin/System";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import { AdminLayout } from "./components/admin/AdminLayout";

const queryClient = new QueryClient();

function AppContent() {
  // Aplicar configurações de SEO
  useSEOConfig();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Layout principal com sidebar para rotas do usuário */}
        <Route path="/" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  <Dashboard />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  <Dashboard />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/transactions" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  <Transactions />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/categories" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  <Categories />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/reports" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  <Reports />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/goals" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  <Goals />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/scheduled" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  <Scheduled />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  <Settings />
                </main>
              </div>
            </div>
          </ProtectedRoute>
        } />
        
        {/* Rotas protegidas do admin com layout próprio */}
        <Route path="/admin/*" element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="system" element={<AdminSystem />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
        </Route>
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
          <Sonner />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
