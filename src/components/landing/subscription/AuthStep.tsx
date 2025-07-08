
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuthForm } from '@/components/auth/AuthForm';
import { ArrowLeft } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

interface AuthStepProps {
  selectedPlan: SubscriptionPlan;
  frequency: 'monthly' | 'yearly';
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  fullName: string;
  setFullName: (name: string) => void;
  whatsapp: string;
  setWhatsapp: (whatsapp: string) => void;
  loading: boolean;
  isSignUp: boolean;
  setIsSignUp: (isSignUp: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onClose: () => void;
}

export const AuthStep = ({
  selectedPlan,
  frequency,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  whatsapp,
  setWhatsapp,
  loading,
  isSignUp,
  setIsSignUp,
  onSubmit,
  onBack,
  onClose
}: AuthStepProps) => {
  const currentPrice = frequency === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly;
  const savings = selectedPlan.price_monthly && selectedPlan.price_yearly 
    ? Math.round(((selectedPlan.price_monthly * 12 - selectedPlan.price_yearly) / (selectedPlan.price_monthly * 12)) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-bold">
                {isSignUp ? 'Criar Conta' : 'Entrar'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Resumo do Plano */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    {selectedPlan.name}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedPlan.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {frequency === 'monthly' ? 'Mensal' : 'Anual'}
                    </Badge>
                    {frequency === 'yearly' && savings > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        {savings}% OFF
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {currentPrice}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {frequency === 'monthly' ? 'por mês' : 'por ano'}
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário de Autenticação */}
            <AuthForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              fullName={fullName}
              setFullName={setFullName}
              whatsapp={whatsapp}
              setWhatsapp={setWhatsapp}
              loading={loading}
              isSignUp={isSignUp}
              setIsSignUp={setIsSignUp}
              onSubmit={onSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
