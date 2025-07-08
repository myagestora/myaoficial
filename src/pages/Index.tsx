
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, Star, CreditCard, TrendingUp, Shield, Users } from 'lucide-react';

const IndexPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Buscar planos para mostrar na landing page
  const { data: plans } = useQuery({
    queryKey: ['subscription-plans-landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })
        .limit(3); // Mostrar apenas os 3 primeiros planos
      
      if (error) throw error;
      return data?.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : 
                  (plan.features ? JSON.parse(plan.features as string) : [])
      }));
    }
  });

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleChoosePlan = () => {
    if (user) {
      navigate('/subscription');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            ✨ Gerencie suas finanças com inteligência
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Controle Total das suas
            <span className="text-primary block">Finanças Pessoais</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Organize receitas, despesas e metas financeiras com nossa plataforma intuitiva. 
            Tenha insights precisos para tomar decisões inteligentes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8">
              Começar Agora
            </Button>
            <Button size="lg" variant="outline" onClick={handleChoosePlan}>
              Ver Planos
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Funcionalidades Principais
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para ter controle total das suas finanças
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle>Controle de Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Registre receitas e despesas facilmente. Categorize e acompanhe 
                  cada movimento financeiro em tempo real.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle>Metas Financeiras</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Defina objetivos mensais e anuais. Monitore seu progresso 
                  e mantenha o foco em suas metas financeiras.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle>Relatórios Detalhados</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Gere relatórios completos com gráficos e análises. 
                  Entenda seus padrões de gastos e tome decisões informadas.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      {plans && plans.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Escolha seu Plano
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Planos flexíveis para diferentes necessidades. Comece grátis e evolua conforme precisar.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => {
                const features = plan.features || [];
                const isPopular = index === 1; // Destacar o plano do meio

                return (
                  <Card key={plan.id} className={`relative ${isPopular ? 'ring-2 ring-primary' : ''}`}>
                    {isPopular && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        Mais Popular
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center">
                      <CardTitle className="flex items-center justify-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        {plan.name}
                      </CardTitle>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="text-center">
                        {plan.price_monthly && (
                          <div className="mb-4">
                            <div className="text-3xl font-bold">
                              R$ {plan.price_monthly}
                              <span className="text-lg font-normal text-muted-foreground">
                                /mês
                              </span>
                            </div>
                            {plan.price_yearly && (
                              <div className="text-sm text-muted-foreground">
                                ou R$ {plan.price_yearly}/ano (economize{' '}
                                {Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)}%)
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {features.length > 0 && (
                        <div className="space-y-2">
                          {features.slice(0, 5).map((feature: string, featureIndex: number) => (
                            <div key={featureIndex} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                          {features.length > 5 && (
                            <div className="text-xs text-muted-foreground">
                              +{features.length - 5} recursos adicionais
                            </div>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={handleChoosePlan}
                        className="w-full flex items-center gap-2"
                        variant={isPopular ? "default" : "outline"}
                      >
                        <CreditCard className="w-4 h-4" />
                        Escolher Plano
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="text-center mt-12">
              <Button onClick={handleChoosePlan} size="lg" variant="outline">
                Ver Todos os Planos
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para Transformar suas Finanças?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já estão no controle das suas finanças. 
            Comece hoje mesmo!
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={handleGetStarted}
            className="text-lg px-8"
          >
            Criar Conta Grátis
          </Button>
        </div>
      </section>
    </div>
  );
};

export default IndexPage;
