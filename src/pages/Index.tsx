import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { SubscriptionFlow } from '@/components/landing/SubscriptionFlow';
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
  Bell,
  Play,
  ChevronDown
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[] | any;
}

const Index = () => {
  const [showSubscriptionFlow, setShowSubscriptionFlow] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

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
      return data?.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : 
                  (plan.features ? JSON.parse(String(plan.features)) : [])
      }));
    }
  });

  const appName = systemConfig?.app_name || 'MYA Gestora';
  const appLogo = systemConfig?.app_logo;
  const primaryColor = systemConfig?.primary_color || '#3B82F6';
  const secondaryColor = systemConfig?.secondary_color || '#10B981';

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowSubscriptionFlow(true);
  };

  const handleStartFree = () => {
    setSelectedPlan(null);
    setShowSubscriptionFlow(true);
  };

  const features = [
    {
      icon: BarChart3,
      title: 'Controle Total',
      description: 'Monitore todas as suas transações em tempo real com relatórios detalhados e insights inteligentes.'
    },
    {
      icon: Target,
      title: 'Metas Inteligentes',
      description: 'Defina objetivos financeiros e acompanhe seu progresso automaticamente com alertas personalizados.'
    },
    {
      icon: CreditCard,
      title: 'Transações Agendadas',
      description: 'Programe pagamentos recorrentes e nunca mais esqueça uma conta importante.'
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Seus dados financeiros protegidos com criptografia bancária de última geração.'
    }
  ];

  const organizationFeatures = [
    {
      icon: Calculator,
      title: 'Orçamento Inteligente',
      description: 'Crie e gerencie seu orçamento mensal com facilidade total e previsões automáticas'
    },
    {
      icon: PieChart,
      title: 'Relatórios Visuais',
      description: 'Gráficos intuitivos e dashboards interativos para entender seus hábitos financeiros'
    },
    {
      icon: Bell,
      title: 'Alertas Personalizados',
      description: 'Receba avisos inteligentes sobre gastos, prazos e oportunidades de economia'
    },
    {
      icon: TrendingUp,
      title: 'Crescimento Financeiro',
      description: 'Acompanhe sua evolução patrimonial e receba dicas para acelerar seus resultados'
    }
  ];

  const whyChooseFeatures = [
    {
      icon: Shield,
      title: 'Proteção Máxima',
      description: 'Tecnologia de segurança bancária para proteger seus dados com certificação ISO'
    },
    {
      icon: Clock,
      title: 'Praticidade Total',
      description: 'Gerencie tudo pelo WhatsApp em segundos, sem complicação ou aplicativos extras'
    },
    {
      icon: Users,
      title: 'Suporte Humano',
      description: 'Equipe dedicada e especializada para tirar suas dúvidas em tempo real'
    },
    {
      icon: Zap,
      title: 'Sempre Evoluindo',
      description: 'Melhorias constantes e novas funcionalidades baseadas no seu feedback'
    }
  ];

  const testimonials = [
    { name: 'Maria Silva', text: 'Organizei minhas finanças em 1 semana! Incrível como é simples.', rating: 5 },
    { name: 'João Santos', text: 'Economizei R$ 800 no primeiro mês usando o planejamento inteligente.', rating: 5 },
    { name: 'Ana Costa', text: 'Finalmente consigo controlar meus gastos sem estresse. Recomendo!', rating: 5 }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <SEOHead />
      
      {/* Header - Modern Floating */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/20 dark:border-gray-700/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              {appLogo && appLogo.trim() !== '' ? (
                <img 
                  src={appLogo} 
                  alt={appName}
                  className="h-12 w-auto object-contain"
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
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
                  }}
                >
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {appName}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost" className="font-semibold">
                  Entrar
                </Button>
              </Link>
              <Button 
                onClick={handleStartFree}
                className="font-semibold shadow-lg hover:shadow-xl transition-all"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  border: 'none'
                }}
              >
                Começar Agora
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Ultra Modern */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {/* Trust Badge */}
            <div className="inline-flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full mb-8">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 dark:text-green-400 font-semibold text-sm">
                +15.000 pessoas organizaram suas finanças
              </span>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="block text-gray-900 dark:text-white mb-2">
                Organize suas
              </span>
              <span className="block text-gray-900 dark:text-white mb-2">
                finanças sem sair
              </span>
              <span className="block">
                <span 
                  className="bg-gradient-to-r bg-clip-text text-transparent font-extrabold"
                  style={{ 
                    backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  do WhatsApp
                </span>
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Controle total da sua vida financeira através de conversas simples e intuitivas. 
              <span className="font-semibold text-gray-900 dark:text-white"> Sem aplicativos complicados.</span>
            </p>
            
            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 mb-12">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                  4.9/5 • 3.847 avaliações
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold"
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                  +2.000 novos usuários este mês
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                onClick={handleStartFree}
                size="lg" 
                className="text-lg px-10 py-6 font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  border: 'none'
                }}
              >
                🚀 Começar Agora
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-6 font-semibold border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300"
              >
                <Play className="mr-2 w-5 h-5" />
                Ver Como Funciona
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center">
              <Shield className="w-4 h-4 mr-2" />
              Você no controle • 100% seguro
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </div>
      </section>

      {/* WhatsApp Demo Section - Enhanced */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-block px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-full mb-6">
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold flex items-center">
                  ✨ Gestão Financeira pelo WhatsApp
                </span>
              </div>
              <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Suas finanças organizadas 
                <span className="text-green-600"> em segundos</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Registre gastos e receitas conversando naturalmente. A {appName} entende você
                e organiza tudo automaticamente, como mágica!
              </p>
              
              {/* Benefits List */}
              <div className="space-y-4 mb-8">
                {[
                  'Reconhecimento automático de valores e categorias',
                  'Relatórios instantâneos e insights personalizados',
                  'Lembretes inteligentes para suas metas financeiras'
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Enhanced WhatsApp Chat */}
            <div className="order-1 lg:order-2">
              <div className="relative">
                {/* Phone Frame */}
                <div className="bg-gradient-to-b from-gray-900 to-black rounded-[3rem] p-4 shadow-2xl">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] p-1">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden">
                      {/* Status Bar */}
                      <div className="bg-gray-50 dark:bg-gray-800 px-6 py-2 flex justify-between items-center text-xs">
                        <span className="font-semibold">9:41</span>
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        </div>
                      </div>

                      {/* WhatsApp Header */}
                      <div className="bg-green-600 px-4 py-3 flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                          <span className="text-green-600 font-bold text-sm">{appName.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{appName} Assistente</h3>
                          <div className="flex items-center text-sm text-green-100">
                            <div className="w-2 h-2 bg-green-300 rounded-full mr-1"></div>
                            online agora
                          </div>
                        </div>
                        <div className="bg-green-500 px-2 py-1 rounded-full">
                          <span className="text-xs text-white font-semibold">🔒 IA Segura</span>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="bg-gradient-to-b from-green-50 to-white dark:from-gray-800 dark:to-gray-900 p-4 space-y-4 min-h-96">
                        {/* User Message 1 */}
                        <div className="flex justify-end">
                          <div className="bg-green-500 text-white rounded-2xl rounded-br-md p-4 max-w-xs shadow-lg">
                            <p className="text-sm font-medium">Gastei R$ 150 de gasolina hoje</p>
                            <div className="flex justify-end items-center mt-2 space-x-1">
                              <span className="text-xs text-green-100">14:22</span>
                              <CheckCircle className="w-3 h-3 text-green-200" />
                            </div>
                          </div>
                        </div>

                        {/* Bot Response 1 */}
                        <div className="flex items-start space-x-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-bl-md p-4 max-w-xs shadow-lg border">
                            <div className="text-sm text-gray-800 dark:text-gray-200">
                              <p className="mb-3 font-semibold text-green-600">✅ Despesa registrada com sucesso!</p>
                              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">💰 Valor:</span>
                                  <span className="font-bold text-red-600">R$ 150,00</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">🏷️ Categoria:</span>
                                  <span className="font-semibold">Transporte</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">⛽ Descrição:</span>
                                  <span>Gasolina</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">📅 Data:</span>
                                  <span>Hoje, 14:22</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 mt-2 block">14:22</span>
                          </div>
                        </div>

                        {/* User Message 2 */}
                        <div className="flex justify-end">
                          <div className="bg-green-500 text-white rounded-2xl rounded-br-md p-4 max-w-xs shadow-lg">
                            <p className="text-sm font-medium">Recebi R$ 350 do freelancer no PIX</p>
                            <div className="flex justify-end items-center mt-2 space-x-1">
                              <span className="text-xs text-green-100">14:25</span>
                              <CheckCircle className="w-3 h-3 text-green-200" />
                            </div>
                          </div>
                        </div>

                        {/* Bot Response 2 */}
                        <div className="flex items-start space-x-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-bl-md p-4 max-w-xs shadow-lg border">
                            <div className="text-sm text-gray-800 dark:text-gray-200">
                              <p className="mb-3 font-semibold text-blue-600">🎉 Receita adicionada!</p>
                              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">💚 Valor:</span>
                                  <span className="font-bold text-green-600">+R$ 350,00</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">🏷️ Categoria:</span>
                                  <span className="font-semibold">Trabalho</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">💼 Origem:</span>
                                  <span>Freelancer</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">📱 Método:</span>
                                  <span>PIX</span>
                                </div>
                              </div>
                              <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-green-700 dark:text-green-300">💡 Saldo do dia:</span>
                                  <span className="font-bold text-green-600">+R$ 200,00</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 mt-2 block">14:25</span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                          <div className="grid grid-cols-2 gap-2">
                            <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-3 text-center shadow-lg hover:shadow-xl transition-all">
                              <BarChart3 className="w-4 h-4 mx-auto mb-1" />
                              <span className="text-xs font-semibold">Ver Resumo</span>
                            </button>
                            <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-3 text-center shadow-lg hover:shadow-xl transition-all">
                              <Target className="w-4 h-4 mx-auto mb-1" />
                              <span className="text-xs font-semibold">Minhas Metas</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organization Features Section - Enhanced */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-6">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                🎯 Ferramentas Completas
              </span>
            </div>
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Tudo que você precisa para 
              <span className="block text-transparent bg-clip-text bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                dominar suas finanças
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Ferramentas profissionais que tornam o controle financeiro simples e eficaz
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {organizationFeatures.map((feature, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg">
                <CardHeader className="text-center">
                  <div className="relative">
                    <div 
                      className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                      style={{ 
                        background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)` 
                      }}
                    >
                      <feature.icon 
                        className="w-10 h-10 group-hover:scale-110 transition-transform duration-300"
                        style={{ color: primaryColor }}
                      />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold mb-3">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section - Enhanced */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full mb-6">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                ⭐ Diferenciais Únicos
              </span>
            </div>
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Por que escolher a {appName}?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Mais de 15.000 pessoas já transformaram suas vidas financeiras conosco
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyChooseFeatures.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div 
                    className="w-24 h-24 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})` 
                    }}
                  >
                    <feature.icon className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Star className="w-4 h-4 text-yellow-800 fill-current" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - New */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              O que nossos usuários dizem
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Histórias reais de transformação financeira
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="relative overflow-hidden border-0 shadow-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} />
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-6 italic text-lg leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Cliente verificado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

      {/* Pricing Section - Enhanced with integrated plan selection */}
      {subscriptionPlans && subscriptionPlans.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-block px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-full mb-6">
                <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent font-bold">
                  🔥 Oferta especial de lançamento
                </span>
              </div>
              <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Escolha o Plano Ideal
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Você pode optar pelo plano Mensal ou Anual
              </p>
            </div>
            
            <div
  className={`grid gap-8 max-w-5xl mx-auto ${
    subscriptionPlans.length === 1
      ? 'grid-cols-1 justify-items-center'
      : 'md:grid-cols-2 lg:grid-cols-3'
  }`}>
              {subscriptionPlans.map((plan, index) => {
                const features = Array.isArray(plan.features) 
                  ? plan.features 
                  : (typeof plan.features === 'string' ? JSON.parse(plan.features) : []);
                
                const isPopular = index === 1;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative text-center transform transition-all duration-300 hover:scale-105 border-0 shadow-xl ${
                      isPopular ? 'scale-105 shadow-2xl' : ''
                    }`}
                    style={isPopular ? { 
                      background: `linear-gradient(135deg, ${primaryColor}05, ${secondaryColor}05)`,
                      borderImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor}) 1`
                    } : {}}
                  >
                    {isPopular && (
                      <>
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                          <Badge 
                            className="px-4 py-2 text-white font-bold shadow-lg"
                            style={{ 
                              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
                            }}
                          >
                            ⭐ MAIS POPULAR
                          </Badge>
                        </div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r" 
                          style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }} 
                        />
                      </>
                    )}
                    <CardHeader className="text-center pb-8">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        {plan.description}
                      </p>
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                          {plan.price_monthly ? (
                            <>

                              R$ {plan.price_monthly.toFixed(2).replace('.', ',')}
                              <span className="text-lg text-gray-500">/mês</span>
                            </>
                          ) : (
                            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              Gratuito
                            </span>
                          )}
                        </div>
                        {plan.price_yearly && (
                          <p className="text-sm text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full">
                            💰 Economize 44% no plano anual
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6 text-left">
                        {features.map((feature: string, featureIndex: number) => (
                          <li key={featureIndex} className="flex items-start">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-gray-600 dark:text-gray-300">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        onClick={() => handlePlanSelect(plan)}
                        className="w-full py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                        style={isPopular ? { 
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                          border: 'none'
                        } : {}}
                        variant={isPopular ? "default" : "outline"}
                      >
                        {plan.price_monthly ? '🚀 Assinar Agora' : '✨ Começar Agora'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Stats Section - Enhanced */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Números que impressionam
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="group">
              <div 
                className="text-6xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                15K+
              </div>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-semibold">Usuários Ativos</p>
              <p className="text-gray-500 dark:text-gray-400">Crescendo 25% ao mês</p>
            </div>
            <div className="group">
              <div 
                className="text-6xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                R$ 80M+
              </div>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-semibold">Transações Gerenciadas</p>
              <p className="text-gray-500 dark:text-gray-400">Valor total organizado</p>
            </div>
            <div className="group">
              <div 
                className="text-6xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                99%
              </div>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-semibold">Satisfação dos Usuários</p>
              <p className="text-gray-500 dark:text-gray-400">Baseado em 3.847 avaliações</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Ultra Enhanced */}
      <section 
        className="py-20 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` 
        }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse" />
          <div className="absolute top-32 right-20 w-16 h-16 bg-white/10 rounded-full animate-pulse delay-1000" />
          <div className="absolute bottom-20 left-32 w-24 h-24 bg-white/10 rounded-full animate-pulse delay-2000" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-6xl font-bold text-white mb-8 leading-tight">
              Pronto para Transformar 
              <span className="block">suas Finanças?</span>
            </h2>
            <p className="text-2xl text-white/90 mb-12 leading-relaxed">
              Junte-se a mais de 15.000 pessoas que já estão no controle total 
              da sua vida financeira com a {appName}. Comece agora mesmo!
            </p>
            
            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
              <Button 
                onClick={handleStartFree}
                size="lg" 
                className="bg-white hover:bg-gray-100 text-gray-900 text-xl px-12 py-6 font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
              >
                🚀 Começar Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-white/80">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span className="font-semibold">Dados 100% Seguros</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Configuração em 2 minutos</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span className="font-semibold">Suporte 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-8">
              {appLogo && appLogo.trim() !== '' ? (
                <img 
                  src={appLogo} 
                  alt={appName}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
                  }}
                >
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
              )}
              <span className="text-2xl font-bold">{appName}</span>
            </div>
            <p className="text-gray-400 mb-8 text-lg max-w-2xl mx-auto">
              Transformando vidas através do controle financeiro inteligente. 
              Sua jornada para a liberdade financeira começa aqui.
            </p>
            
            {/* Social Proof */}
            <div className="flex justify-center items-center space-x-4 mb-8">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-gray-300">4.9/5 • 3.847 avaliações</span>
            </div>
            
            <div className="border-t border-gray-800 pt-8">
              <p className="text-gray-500 text-sm">
                © 2025 {appName}. Todos os direitos reservados. 
                <span className="block mt-2">
                  Feito com ❤️ para transformar sua vida financeira por <a href="https://www.b1m.digital" target="_blank"><strong>B1M</strong></a>.
                </span>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Subscription Flow Modal */}
      {showSubscriptionFlow && (
        <SubscriptionFlow 
          onClose={() => {
            setShowSubscriptionFlow(false);
            setSelectedPlan(null);
          }}
          selectedPlan={selectedPlan}
        />
      )}
    </div>
  );
};

export default Index;
