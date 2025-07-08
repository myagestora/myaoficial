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
  ArrowRight,
  MessageCircle,
  Clock,
  TrendingUp,
  PieChart,
  Calculator,
  Bell
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

  const organizationFeatures = [
    {
      icon: Calculator,
      title: 'Orçamento Inteligente',
      description: 'Crie e gerencie seu orçamento mensal com facilidade total'
    },
    {
      icon: PieChart,
      title: 'Relatórios Visuais',
      description: 'Gráficos intuitivos para entender seus hábitos financeiros'
    },
    {
      icon: Bell,
      title: 'Alertas Personalizados',
      description: 'Receba avisos sobre gastos e prazos importantes'
    },
    {
      icon: TrendingUp,
      title: 'Crescimento Financeiro',
      description: 'Acompanhe sua evolução patrimonial mês a mês'
    }
  ];

  const whyChooseFeatures = [
    {
      icon: Shield,
      title: 'Proteção Máxima',
      description: 'Tecnologia de segurança bancária para proteger seus dados'
    },
    {
      icon: Clock,
      title: 'Praticidade Total',
      description: 'Gerencie tudo pelo WhatsApp, sem complicação'
    },
    {
      icon: Users,
      title: 'Suporte Humano',
      description: 'Equipe dedicada para tirar suas dúvidas sempre'
    },
    {
      icon: Zap,
      title: 'Sempre Evoluindo',
      description: 'Melhorias constantes baseadas no seu feedback'
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
                  className="h-16 w-auto object-contain"
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
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <DollarSign className="w-9 h-9 text-white" />
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Organize suas finanças
            <span className="block mt-2">
              sem sair do
            </span>
            <span className="block mt-2">
              <span 
                className="text-transparent bg-clip-text bg-gradient-to-r"
                style={{ 
                  backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                WhatsApp
              </span>
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            Controle total da sua vida financeira através de conversas simples e intuitivas
          </p>
          
          {/* Rating Section */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className="flex items-center space-x-1">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div 
                    key={step}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    {step}
                  </div>
                ))}
              </div>
              <div className="flex items-center ml-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
                <span className="ml-2 text-gray-600 dark:text-gray-300">
                  4.9/5 • 2.847 avaliações
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link to="/login">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4"
                style={{ backgroundColor: primaryColor }}
              >
                ⚡ Começar Gratuitamente
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4">
              📱 Já tenho conta
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ⚡ Controle financeiro inteligente a um clique de distância
          </p>
        </div>
      </section>

      {/* WhatsApp Example Section - Updated Design */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                <span className="text-green-600 dark:text-green-400 font-semibold flex items-center">
                  ✨ Revolucione sua Vida Financeira
                </span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Suas finanças organizadas pelo WhatsApp
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                Registre gastos e receitas conversando naturalmente. Nosso assistente entende você e organiza tudo automaticamente!
              </p>
            </div>
            
            {/* WhatsApp Chat Simulation */}
            <div className="relative">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 max-w-md mx-auto">
                {/* WhatsApp Header */}
                <div className="flex items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">{appName.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{appName} Assistente</h3>
                    <div className="flex items-center text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      online
                    </div>
                  </div>
                  <div className="ml-auto text-blue-600">
                    <span className="bg-blue-100 px-2 py-1 rounded-full text-xs">🔒 Seguro</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-4">
                  {/* User Message 1 */}
                  <div className="flex justify-end">
                    <div className="bg-green-500 text-white rounded-lg p-3 max-w-xs">
                      <p className="text-sm">Gastei R$ 150 de gasolina hoje</p>
                      <span className="text-xs text-green-100">14:22</span>
                    </div>
                  </div>

                  {/* Bot Response 1 */}
                  <div className="flex items-start">
                    <div className="bg-gray-200 dark:bg-gray-600 rounded-lg p-3 max-w-xs">
                      <div className="text-sm text-gray-800 dark:text-gray-200">
                        <p className="mb-2">✅ <strong>Despesa registrada!</strong></p>
                        <div className="text-xs space-y-1 bg-white dark:bg-gray-700 p-2 rounded">
                          <div>💰 <strong>Valor:</strong> R$ 150,00</div>
                          <div>🏷️ <strong>Categoria:</strong> Transporte</div>
                          <div>⛽ <strong>Descrição:</strong> Gasolina</div>
                          <div>📅 <strong>Data:</strong> Hoje</div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">14:22</span>
                    </div>
                  </div>

                  {/* User Message 2 */}
                  <div className="flex justify-end">
                    <div className="bg-green-500 text-white rounded-lg p-3 max-w-xs">
                      <p className="text-sm">Recebi R$ 350 do freelancer no PIX</p>
                      <span className="text-xs text-green-100">14:25</span>
                    </div>
                  </div>

                  {/* Bot Response 2 */}
                  <div className="flex items-start">
                    <div className="bg-gray-200 dark:bg-gray-600 rounded-lg p-3 max-w-xs">
                      <div className="text-sm text-gray-800 dark:text-gray-200">
                        <p className="mb-2">🎉 <strong>Receita adicionada!</strong></p>
                        <div className="text-xs space-y-1 bg-white dark:bg-gray-700 p-2 rounded">
                          <div>💚 <strong>Valor:</strong> R$ 350,00</div>
                          <div>🏷️ <strong>Categoria:</strong> Trabalho</div>
                          <div>💼 <strong>Descrição:</strong> Freelancer</div>
                          <div>📱 <strong>Forma:</strong> PIX</div>
                        </div>
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-green-700 dark:text-green-300">
                          💡 <strong>Saldo do dia:</strong> +R$ 200,00
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">14:25</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-500 text-white rounded-lg p-2 text-center">
                      <span className="text-xs">📊 Ver Resumo</span>
                    </div>
                    <div className="bg-purple-500 text-white rounded-lg p-2 text-center">
                      <span className="text-xs">🎯 Minhas Metas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organization Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tudo que você precisa para organizar suas finanças
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Ferramentas completas para ter controle total do seu dinheiro
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {organizationFeatures.map((feature, index) => (
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

      {/* Why Choose Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Por que escolher o {appName}?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Mais de 10.000 pessoas já transformaram suas vidas financeiras
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyChooseFeatures.map((feature, index) => (
              <div key={index} className="text-center">
                <div 
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${secondaryColor}20` }}
                >
                  <feature.icon 
                    className="w-10 h-10"
                    style={{ color: secondaryColor }}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
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

      {/* Pricing Section - Updated with centered prices */}
      {subscriptionPlans && subscriptionPlans.length > 0 && (
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Escolha o Plano Ideal
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Comece gratuitamente e evolua conforme suas necessidades
              </p>
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  🎉 Oferta Especial: 50% OFF no primeiro mês de qualquer plano pago!
                </p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {subscriptionPlans.map((plan, index) => {
                const features = Array.isArray(plan.features) 
                  ? plan.features 
                  : JSON.parse(String(plan.features) || '[]');
                
                const isPopular = index === 1;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative text-center ${isPopular ? 'ring-2 scale-105' : ''}`}
                    style={isPopular ? { borderColor: primaryColor, borderWidth: '2px' } : {}}
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
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
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
                            ou R${plan.price_yearly}/ano (economize 20%)
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6 text-left">
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
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
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
