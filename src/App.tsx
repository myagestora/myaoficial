
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { Login } from "@/components/auth/Login";
import { Register } from "@/components/auth/Register";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Settings } from "@/components/admin/Settings";
import { SEOHead } from "@/components/SEOHead";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <MainLayout>
              <div>Dashboard</div>
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <Register />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          user && isAdmin ? (
            <AdminLayout>
              <div>Admin Dashboard</div>
            </AdminLayout>
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/settings"
        element={
          user && isAdmin ? (
            <AdminLayout>
              <Settings />
            </AdminLayout>
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SEOHead />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
