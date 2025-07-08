
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Check, Star, CreditCard, TrendingUp, Shield, Users, DollarSign, Zap, Target, BarChart3 } from 'lucide-react';

const IndexPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Buscar configurações do sistema para personalização da landing page
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config-landing'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('*')
          .in('key', [
            'app_name', 'app_logo', 'app_slogan', 'hero_title', 'hero_subtitle',
            'hero_description', 'feature_1_title', 'feature_1_description',
            'feature_2_title', 'feature_2_description', 'feature_3_title',
            'feature_3_description', 'cta_title', 'cta_description',
            'primary_color', 'secondary_color'
          ]);
        
        if (error) {
          console.error('Error fetching system config:', error);
          return {};
        }
        
        const configObj: Record<string, string> = {};
        data?.forEach(item => {
          configObj[item.key] = typeof item.value === 'string' ? 
            item.value.replace(/^"|"$/g, '') : 
            JSON.stringify(item.value).replace(/^"|"$/g, '');
        });
        
        return configObj;
      } catch (error) {
        console.error('Error in system config query:', error);
        return {};
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Buscar planos de assinatura ativos
  const { data: subscriptionPlans } = useQuery({
    queryKey: ['subscription-plans-landing'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });
        
        if (error) {
          console.error('Error fetching subscription plans:', error);
          return [];
        }
        
        return data || [];
      } catch (error) {
        console.error('Error in subscription plans query:', error);
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Valores padrão com fallbacks
  const appName = systemConfig?.app_name || 'MYA Gestora';
  const appLogo = systemConfig?.app_logo;
  const heroTitle = systemConfig?.hero_title || 'Controle Total das suas';
  const heroSubtitle = systemConfig?.hero_subtitle || 'Finanças Pessoais';
  const heroDescription = systemConfig?.hero_description || 'Organize receitas, despesas e metas financeiras com nossa plataforma intuitiva. Tenha insights precisos para tomar decisões inteligentes.';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {appLogo && appLogo.trim() !== '' ? (
              <img 
                src={appLogo} 
                alt={appName}
                className="h-8 w-auto object-contain"
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
            
            <div className={`flex items-center logo-fallback ${appLogo && appLogo.trim() !== '' ? 'hidden' : ''}`}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-2">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <span className="text-xl font-bold text-foreground">{appName}</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Button variant="ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Funcionalidades
            </Button>
            <Button variant="ghost" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
              Planos
            </Button>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Entrar
            </Button>
            <Button onClick={handleGetStarted}>
              Começar Grátis
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2">
              ✨ Gerencie suas finanças com inteligência
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              {heroTitle}
              <span className="text-primary block mt-2">{heroSubtitle}</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              {heroDescription}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-4 h-auto">
                <Zap className="w-5 h-5 mr-2" />
                Começar Agora
              </Button>
              <Button size="lg" variant="outline" onClick={handleChoosePlan} className="text-lg px-8 py-4 h-auto">
                <CreditCard className="w-5 h-5 mr-2" />
                Ver Planos
              </Button>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">10K+</div>
                <div className="text-muted-foreground">Usuários Ativos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">R$ 50M+</div>
                <div className="text-muted-foreground">Em Transações</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">98%</div>
                <div className="text-muted-foreground">Satisfação</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Funcionalidades Principais
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para ter controle total das suas finanças
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Controle de Transações</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed">
                  Registre receitas e despesas facilmente. Categorize e acompanhe 
                  cada movimento financeiro em tempo real com relatórios detalhados.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Metas Financeiras</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed">
                  Defina objetivos mensais e anuais. Monitore seu progresso 
                  e mantenha o foco em suas metas financeiras com alertas inteligentes.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Relatórios Inteligentes</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed">
                  Gere relatórios automáticos com gráficos interativos e análises. 
                  Entenda seus padrões de gastos e tome decisões informadas.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Segurança Total</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed">
                  Seus dados protegidos com criptografia avançada e backups automáticos. 
                  Segurança bancária para suas informações financeiras.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Gestão Familiar</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed">
                  Compartilhe controle financeiro com sua família. Múltiplos usuários 
                  com permissões personalizadas e visão unificada.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Automação Inteligente</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed">
                  Automatize transações recorrentes e categorização inteligente. 
                  Economize tempo com recursos de IA integrados.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      {subscriptionPlans && subscriptionPlans.length > 0 && (
        <section id="pricing" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                Escolha Seu Plano
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Planos flexíveis para atender suas necessidades financeiras
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {subscriptionPlans.map((plan, index) => (
                <Card key={plan.id} className={`border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                  index === 1 ? 'border-primary shadow-primary/20' : 'border-border'
                }`}>
                  <CardHeader className="text-center pb-8">
                    {index === 1 && (
                      <Badge className="mb-4 bg-primary text-primary-foreground">
                        Mais Popular
                      </Badge>
                    )}
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
                    <div className="mt-6">
                      <span className="text-4xl font-bold text-primary">
                        R$ {plan.price_monthly}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.features && Array.isArray(plan.features) && plan.features.map((feature: string, featureIndex: number) => (
                      <div key={featureIndex} className="flex items-center space-x-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    <Button 
                      className="w-full mt-8" 
                      variant={index === 1 ? "default" : "outline"}
                      onClick={handleChoosePlan}
                    >
                      Escolher Plano
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              {systemConfig?.cta_title || 'Pronto para Transformar suas Finanças?'}
            </h2>
            <p className="text-xl mb-10 opacity-90 leading-relaxed">
              {systemConfig?.cta_description || 'Junte-se a milhares de pessoas que já estão no controle das suas finanças. Comece hoje mesmo e veja a diferença!'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary" 
                onClick={handleGetStarted}
                className="text-lg px-8 py-4 h-auto"
              >
                <Star className="w-5 h-5 mr-2" />
                Criar Conta Grátis
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleChoosePlan}
                className="text-lg px-8 py-4 h-auto border-white/20 text-white hover:bg-white/10"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/50 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              {appLogo && appLogo.trim() !== '' ? (
                <img 
                  src={appLogo} 
                  alt={appName}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-lg font-semibold text-foreground">{appName}</span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-muted-foreground text-sm">
                © 2024 {appName}. Todos os direitos reservados.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Desenvolvido com ❤️ para sua segurança financeira
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndexPage;
