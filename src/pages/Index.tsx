
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  DollarSign, 
  BarChart3, 
  Target, 
  CreditCard, 
  Shield,
  Users,
  Zap,
  Star,
  ArrowRight
} from 'lucide-react';

const Index = () => {
  // Buscar configurações do sistema
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config-landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .in('key', ['app_name', 'app_logo', 'primary_color', 'secondary_color']);
      
      if (error) throw error;
      
      const configObj: Record<string, string> = {};
      data.forEach(item => {
        configObj[item.key] = typeof item.value === 'string' ? 
          item.value.replace(/^"|"$/g, '') : 
          JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      return configObj;
    }
  });

  // Buscar planos de assinatura ativos
  const { data: subscriptionPlans } = useQuery({
    queryKey: ['subscription-plans-landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const appName = systemConfig?.app_name || 'MYA Gestora';
  const appLogo = systemConfig?.app_logo;
  const primaryColor = systemConfig?.primary_color || '#3B82F6';
  const secondaryColor = systemConfig?.secondary_color || '#10B981';

  const features = [
    {
      icon: BarChart3,
      title: 'Controle Total',
      description: 'Monitore todas as suas transações em tempo real com relatórios detalhados.'
    },
    {
      icon: Target,
      title: 'Metas Inteligentes',
      description: 'Defina objetivos financeiros e acompanhe seu progresso automaticamente.'
    },
    {
      icon: CreditCard,
      title: 'Transações Agendadas',
      description: 'Programe pagamentos recorrentes e nunca mais esqueça uma conta.'
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Seus dados financeiros protegidos com criptografia de ponta.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              {appLogo && appLogo.trim() !== '' ? (
                <img 
                  src={appLogo} 
                  alt={appName}
                  className="h-10 w-auto object-contain"
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
              
              <div className={`flex items-center space-x-2 logo-fallback ${appLogo && appLogo.trim() !== '' ? 'hidden' : ''}`}>
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {appName}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="outline">Entrar</Button>
              </Link>
              <Link to="/login">
                <Button style={{ backgroundColor: primaryColor }}>
                  Começar Agora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` 
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Transforme sua
            <span 
              className="text-transparent bg-clip-text ml-3"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                WebkitBackgroundClip: 'text'
              }}
            >
              Vida Financeira
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Controle completo das suas finanças com uma interface intuitiva, 
            relatórios inteligentes e metas personalizadas para alcançar seus objetivos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4"
                style={{ backgroundColor: primaryColor }}
              >
                Começar Gratuitamente
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4">
              Ver Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Recursos Poderosos
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Tudo que você precisa para ter controle total das suas finanças
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div 
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <feature.icon 
                      className="w-8 h-8"
                      style={{ color: primaryColor }}
                    />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      {subscriptionPlans && subscriptionPlans.length > 0 && (
        <section className="py-20 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Planos e Preços
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Escolha o plano ideal para suas necessidades
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {subscriptionPlans.map((plan, index) => {
                const features = Array.isArray(plan.features) 
                  ? plan.features 
                  : JSON.parse(plan.features || '[]');
                
                const isPopular = index === 1; // Segundo plano como popular
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative ${isPopular ? 'ring-2 scale-105' : ''}`}
                    style={isPopular ? { ringColor: primaryColor } : {}}
                  >
                    {isPopular && (
                      <Badge 
                        className="absolute -top-3 left-1/2 transform -translate-x-1/2"
                        style={{ backgroundColor: secondaryColor }}
                      >
                        Mais Popular
                      </Badge>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        {plan.description}
                      </p>
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        {plan.price_monthly ? (
                          <>
                            R${plan.price_monthly}
                            <span className="text-lg text-gray-500">/mês</span>
                          </>
                        ) : (
                          'Gratuito'
                        )}
                      </div>
                      {plan.price_yearly && (
                        <p className="text-sm text-gray-500">
                          ou R${plan.price_yearly}/ano
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {features.map((feature: string, featureIndex: number) => (
                          <li key={featureIndex} className="flex items-start">
                            <CheckCircle 
                              className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0"
                              style={{ color: secondaryColor }}
                            />
                            <span className="text-gray-600 dark:text-gray-300">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Link to="/login">
                        <Button 
                          className="w-full"
                          variant={isPopular ? "default" : "outline"}
                          style={isPopular ? { backgroundColor: primaryColor } : {}}
                        >
                          {plan.price_monthly ? 'Assinar Agora' : 'Começar Grátis'}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: primaryColor }}
              >
                10K+
              </div>
              <p className="text-gray-600 dark:text-gray-300">Usuários Ativos</p>
            </div>
            <div>
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: primaryColor }}
              >
                R$ 50M+
              </div>
              <p className="text-gray-600 dark:text-gray-300">Transações Gerenciadas</p>
            </div>
            <div>
              <div 
                className="text-4xl font-bold mb-2"
                style={{ color: primaryColor }}
              >
                98%
              </div>
              <p className="text-gray-600 dark:text-gray-300">Satisfação dos Usuários</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-20 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` 
        }}
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para Transformar suas Finanças?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já estão no controle total 
            da sua vida financeira com {appName}.
          </p>
          <Link to="/login">
            <Button 
              size="lg" 
              className="bg-white hover:bg-gray-100 text-gray-900 text-lg px-8 py-4"
            >
              Começar Agora - É Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              {appLogo && appLogo.trim() !== '' ? (
                <img 
                  src={appLogo} 
                  alt={appName}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-xl font-bold">{appName}</span>
            </div>
            <p className="text-gray-400 mb-6">
              Transformando vidas através do controle financeiro inteligente.
            </p>
            <p className="text-gray-500 text-sm">
              © 2025 {appName}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
