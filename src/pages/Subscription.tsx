
import React from 'react';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

const SubscriptionPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não estiver logado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <SubscriptionPlans />
      </div>
    </div>
  );
};

export default SubscriptionPage;
