import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Star, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionCheckout } from '@/components/subscription/SubscriptionCheckout';
import { AuthForm } from '@/components/auth/AuthForm';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

const Index = () => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [planToSignup, setPlanToSignup] = useState<SubscriptionPlan | null>(null);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);

  // Buscar configurações do sistema
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config-landing'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('*')
          .in('key', ['app_name', 'app_logo']);
        
        if (error) throw error;
        
        const configObj: Record<string, string> = {};
        data?.forEach(item => {
          configObj[item.key] = typeof item.value === 'string' ? 
            item.value.replace(/^"|"$/g, '') : 
            JSON.stringify(item.value).replace(/^"|"$/g, '');
        });
        
        return configObj;
      } catch (error) {
        console.error('Error fetching system config:', error);
        return { app_name: 'MYA Gestora', app_logo: '' };
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Buscar planos de assinatura
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans-landing'],
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

  const appName = systemConfig?.app_name || 'MYA Gestora';
  const appLogo = systemConfig?.app_logo;

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    if (user) {
      setSelectedPlan(plan);
    } else {
      setPlanToSignup(plan);
      setShowAuth(true);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              whatsapp: whatsapp
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) throw error;
        
        // Após criar a conta, redirecionar para checkout
        if (planToSignup) {
          setSelectedPlan(planToSignup);
          setShowAuth(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        
        // Após login, redirecionar para checkout
        if (planToSignup) {
          setSelectedPlan(planToSignup);
          setShowAuth(false);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Se um plano foi selecionado e usuário está logado, mostrar checkout
  if (selectedPlan && user) {
    return (
      <SubscriptionCheckout 
        plan={selectedPlan} 
        onCancel={() => setSelectedPlan(null)} 
      />
    );
  }

  // Se está mostrando formulário de auth
  if (showAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => setShowAuth(false)}
              className="mb-4"
            >
              ← Voltar para planos
            </Button>
            {planToSignup && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                  Plano selecionado: {planToSignup.name}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {planToSignup.price_monthly && `R$ ${planToSignup.price_monthly}/mês`}
                </p>
              </div>
            )}
          </div>
          
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
            onSubmit={handleAuthSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              {appLogo && appLogo.trim() !== '' ? (
                <img 
                  src={appLogo} 
                  alt={appName}
                  className="h-12 w-auto object-contain mr-3"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              
              <div className={`flex items-center justify-center logo-fallback ${appLogo && appLogo.trim() !== '' ? 'hidden' : ''}`}>
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mr-3">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {appName}
              </h1>
            </div>
            
            {user ? (
              <Button onClick={() => window.location.href = '/dashboard'}>
                Dashboard
              </Button>
            ) : (
              <Button onClick={() => window.location.href = '/login'} variant="outline">
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Gerencie suas finanças com inteligência
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Controle total sobre seus gastos, metas financeiras e muito mais. 
            Simplifique sua vida financeira com nossa plataforma completa.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Escolha seu Plano
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Selecione o plano que melhor atende às suas necessidades
            </p>
          </div>

          {plansLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans?.map((plan) => {
                const features = plan.features || [];
                return (
                  <div key={plan.id} className="relative bg-gray-50 dark:bg-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="text-center mb-8">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Star className="h-6 w-6 text-yellow-500" />
                        <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {plan.name}
                        </h4>
                      </div>
                      
                      {plan.description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                          {plan.description}
                        </p>
                      )}

                      {plan.price_monthly && (
                        <div className="mb-6">
                          <div className="text-4xl font-bold text-gray-900 dark:text-white">
                            R$ {plan.price_monthly}
                            <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                              /mês
                            </span>
                          </div>
                          {plan.price_yearly && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              ou R$ {plan.price_yearly}/ano (economize{' '}
                              {Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)}%)
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {features.length > 0 && (
                      <div className="space-y-4 mb-8">
                        {features.map((feature: string, index: number) => (
                          <div key={index} className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={() => handlePlanSelect(plan)}
                      className="w-full py-3 text-lg font-semibold"
                      size="lg"
                    >
                      Escolher Plano
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Recursos Principais
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Controle Total
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                Gerencie todas as suas transações em um só lugar
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Metas Inteligentes
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                Defina e acompanhe seus objetivos financeiros
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Relatórios Detalhados
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                Visualize seus dados com gráficos e relatórios
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2024 {appName}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
