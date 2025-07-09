
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { DollarSign, ArrowLeft, Mail, Lock, User, Phone } from 'lucide-react';
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

export const AuthStep: React.FC<AuthStepProps> = ({
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
}) => {
  // Buscar configurações do sistema para logo e nome
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config-auth-step'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('*')
          .in('key', ['app_name', 'app_logo']);
        
        if (error) {
          console.error('Error fetching system config:', error);
          return { app_name: 'MYA Gestora', app_logo: '' };
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
        return { app_name: 'MYA Gestora', app_logo: '' };
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  const appName = systemConfig?.app_name || 'MYA Gestora';
  const appLogo = systemConfig?.app_logo;

  const handleWhatsappChange = (value: string) => {
    setWhatsapp(value || '');
  };

  const price = frequency === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          {/* Botão de voltar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="absolute top-4 left-4 text-gray-600 hover:text-gray-800 z-10"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          {/* Botão de fechar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 z-10"
          >
            ×
          </Button>

          {/* Logo */}
          <div className="flex justify-center mb-4">
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
            
            <div className={`flex items-center justify-center logo-fallback ${appLogo && appLogo.trim() !== '' ? 'hidden' : ''}`}>
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Criar Conta' : 'Entrar'}
          </CardTitle>
          
          {/* Informações do plano selecionado */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Plano selecionado:</p>
            <p className="font-semibold text-lg">{selectedPlan.name}</p>
            <p className="text-2xl font-bold text-purple-600">
              R$ {price?.toFixed(2)} 
              <span className="text-sm font-normal">/{frequency === 'monthly' ? 'mês' : 'ano'}</span>
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Nome completo - apenas no cadastro */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-12"
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
              </div>
            )}
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  placeholder="Digite seu email"
                  required
                />
              </div>
            </div>
            
            {/* WhatsApp - apenas no cadastro e obrigatório */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">
                  WhatsApp
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 z-10" />
                  <PhoneInput
                    id="whatsapp"
                    value={whatsapp}
                    onChange={handleWhatsappChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}
            
            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  placeholder="Digite sua senha"
                  required
                />
              </div>
            </div>
            
            {/* Botão principal */}
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processando...
                </div>
              ) : (
                isSignUp ? 'Criar Conta e Continuar' : 'Entrar e Continuar'
              )}
            </Button>
          </form>
          
          {/* Link de navegação */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-purple-600 hover:text-purple-700 hover:underline font-medium"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
