
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { AuthForm } from '@/components/auth/AuthForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

interface SubscriptionFlowProps {
  onClose: () => void;
  selectedPlan?: SubscriptionPlan;
}

export const SubscriptionFlow = ({ onClose, selectedPlan }: SubscriptionFlowProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              whatsapp: whatsapp,
            }
          }
        });

        if (error) {
          toast({
            title: 'Erro no cadastro',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Conta criada!',
          description: 'Verifique seu email para confirmar a conta.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: 'Erro no login',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Login realizado!',
          description: 'Redirecionando para o checkout...',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Se usuário está logado, mostrar planos
  if (user) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Escolha seu Plano</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <SubscriptionPlans />
          </div>
        </div>
      </div>
    );
  }

  // Se não está logado, mostrar formulário de auth
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {selectedPlan ? `Assinar ${selectedPlan.name}` : 'Entre ou Cadastre-se'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          {selectedPlan && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                {selectedPlan.name}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {selectedPlan.description}
              </p>
              <div className="mt-2">
                {selectedPlan.price_monthly && (
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    R$ {selectedPlan.price_monthly}/mês
                  </p>
                )}
                {selectedPlan.price_yearly && (
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ou R$ {selectedPlan.price_yearly}/ano
                  </p>
                )}
              </div>
            </div>
          )}

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
            onSubmit={handleAuth}
          />
        </div>
      </div>
    </div>
  );
};
