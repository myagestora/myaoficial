
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, ArrowRight, DollarSign, TrendingUp, Shield } from 'lucide-react';
import { SubscriptionFlow } from '@/components/landing/SubscriptionFlow';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

const Index = () => {
  const [showSubscriptionFlow, setShowSubscriptionFlow] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | undefined>();

  const { data: plans, isLoading } = useQuery({
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

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowSubscriptionFlow(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FinanceApp</h1>
          </div>
          <Button 
            variant="outline"
            onClick={() => setShowSubscriptionFlow(true)}
          >
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Controle Total das suas <span className="text-blue-600">Finanças</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Organize suas receitas e despesas, defina metas financeiras e alcance a liberdade financeira 
            com nossa plataforma completa de gestão financeira pessoal.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-3"
            onClick={() => setShowSubscriptionFlow(true)}
          >
            Comece Agora <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Recursos Poderosos para sua Gestão Financeira
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Relatórios Inteligentes</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Visualize seus gastos e receitas com gráficos detalhados e insights automatizados.
              </p>
            </div>
            <div className="text-center p-6">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Segurança Total</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Seus dados estão protegidos com criptografia de ponta e backup automático.
              </p>
            </div>
            <div className="text-center p-6">
              <DollarSign className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">Metas Financeiras</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Defina objetivos e acompanhe seu progresso rumo à independência financeira.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Escolha o Plano Ideal para Você
          </h3>
          
          {isLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans?.map((plan, index) => (
                <Card key={plan.id} className={`relative ${index === 1 ? 'ring-2 ring-blue-500 scale-105' : ''}`}>
                  {index === 1 && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500">
                      Mais Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      {plan.name}
                    </CardTitle>
                    {plan.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-center">
                      {plan.price_monthly && (
                        <div className="mb-4">
                          <div className="text-3xl font-bold">
                            R$ {plan.price_monthly}
                            <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                              /mês
                            </span>
                          </div>
                          {plan.price_yearly && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              ou R$ {plan.price_yearly}/ano (economize{' '}
                              {Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)}%)
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {plan.features && plan.features.length > 0 && (
                      <div className="space-y-2">
                        {plan.features.map((feature: string, featureIndex: number) => (
                          <div key={featureIndex} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={() => handlePlanSelect(plan)}
                      className="w-full"
                      variant={index === 1 ? "default" : "outline"}
                    >
                      Escolher Plano
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold mb-6">
            Pronto para Transformar suas Finanças?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Junte-se a milhares de usuários que já estão no controle de suas finanças.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-lg px-8 py-3"
            onClick={() => setShowSubscriptionFlow(true)}
          >
            Começar Gratuitamente
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <DollarSign className="h-6 w-6" />
            <span className="text-xl font-bold">FinanceApp</span>
          </div>
          <p className="text-gray-400">
            © 2024 FinanceApp. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Subscription Flow Modal */}
      {showSubscriptionFlow && (
        <SubscriptionFlow
          onClose={() => {
            setShowSubscriptionFlow(false);
            setSelectedPlan(undefined);
          }}
          selectedPlan={selectedPlan}
        />
      )}
    </div>
  );
};

export default Index;
