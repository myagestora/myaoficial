
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { user, isAdmin, loading } = useAuth();

  console.log('ProtectedRoute - user:', user?.email, 'isAdmin:', isAdmin, 'loading:', loading, 'requireAdmin:', requireAdmin);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="p-6">
          <CardContent>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-center mt-4">Verificando autenticação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não há usuário logado, redirecionar para login
  if (!user) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Se requer admin mas o usuário não é admin, mostrar erro ao invés de redirecionar
  if (requireAdmin && !isAdmin) {
    console.log('Admin required but user is not admin, showing access denied');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="p-6 max-w-md mx-auto">
          <CardContent>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
              <p className="text-gray-600 mb-4">
                Você não tem permissão para acessar esta área. 
                Apenas administradores podem acessar o painel administrativo.
              </p>
              <p className="text-sm text-gray-500">
                Usuário atual: {user.email}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('Access granted');
  return <>{children}</>;
};
