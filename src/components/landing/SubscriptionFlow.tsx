
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { AuthForm } from '@/components/auth/AuthForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';

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
  const [showPlans, setShowPlans] = useState(!selectedPlan);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');

  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      
      if (error) throw error;
      return data?.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : 
                  (plan.features ? JSON.parse(plan.features as string) : [])
      }));
    }
  });

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

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para assinar um plano.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-mercado-pago-subscription', {
        body: { 
          planId: plan.id, 
          subscriptionFrequency: frequency 
        }
      });

      if (error) throw error;

      if (data.init_point) {
        window.open(data.init_point, '_blank');
        toast({
          title: 'Redirecionamento',
          description: 'Você será redirecionado para completar sua assinatura.',
        });
      }
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar assinatura. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Se usuário está logado e tem plano selecionado, mostrar checkout
  if (user && selectedPlan) {
    const currentPrice = frequency === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly;
    const savings = selectedPlan.price_monthly && selectedPlan.price_yearly 
      ? Math.round(((selectedPlan.price_monthly * 12 - selectedPlan.price_yearly) / (selectedPlan.price_monthly * 12)) * 100)
      : 0;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Finalizar Assinatura</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Informações do Plano */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                {selectedPlan.name}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {selectedPlan.description}
              </p>
            </div>

            {/* Seleção de Frequência */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Escolha a frequência de pagamento:</Label>
              <RadioGroup value={frequency} onValueChange={(value: 'monthly' | 'yearly') => setFrequency(value)}>
                {selectedPlan.price_monthly && (
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">Mensal</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Cobrança todo mês
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">R$ {selectedPlan.price_monthly}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">por mês</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                )}

                {selectedPlan.price_yearly && (
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <RadioGroupItem value="yearly" id="yearly" />
                    <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            Anual
                            {savings > 0 && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {savings}% OFF
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Cobrança anual (economize {savings}%)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">R$ {selectedPlan.price_yearly}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">por ano</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>

            {/* Features do Plano */}
            {selectedPlan.features && selectedPlan.features.length > 0 && (
              <div className="space-y-3">
                <Label className="text-lg font-semibold">O que está incluído:</Label>
                <div className="space-y-2">
                  {selectedPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo do Pagamento */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span>Plano selecionado:</span>
                <span className="font-medium">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Frequência:</span>
                <span className="font-medium capitalize">{frequency === 'monthly' ? 'Mensal' : 'Anual'}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>R$ {currentPrice}</span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={loading}
                className="flex-1 flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {loading ? 'Processando...' : 'Assinar Agora'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se usuário está logado mas não tem plano selecionado, mostrar planos
  if (user && !selectedPlan) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-6xl w-full h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Escolha seu Plano</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <SubscriptionPlans />
          </div>
        </div>
      </div>
    );
  }

  // Se não está logado, mostrar formulário de auth
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
              {selectedPlan.price_monthly && (
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-2">
                  R$ {selectedPlan.price_monthly}/mês
                </p>
              )}
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
