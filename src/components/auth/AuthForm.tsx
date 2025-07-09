
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { DollarSign, ArrowLeft, Mail, Lock, User, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuthFormProps {
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
  isResetPassword?: boolean;
  setIsResetPassword?: (isReset: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBackToHome?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({
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
  isResetPassword = false,
  setIsResetPassword,
  onSubmit,
  onBackToHome
}) => {
  // Buscar configurações do sistema para logo e nome com tratamento de erro melhorado
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config-auth'],
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

  const getTitle = () => {
    if (isResetPassword) return 'Recuperar Senha';
    if (isSignUp) return 'Criar Conta';
    return `Entrar no ${appName}`;
  };

  const getDescription = () => {
    if (isResetPassword) return 'Digite seu email para receber o link de recuperação';
    if (isSignUp) return 'Preencha os dados para criar sua conta';
    return 'Entre com suas credenciais para acessar sua conta';
  };

  return (
    <div className="relative">
      <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
        <CardHeader className="text-center space-y-4 pb-6">
          {/* Botão de voltar */}
          {onBackToHome && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToHome}
              className="absolute top-4 left-4 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Início
            </Button>
          )}

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

          {/* Título e descrição */}
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {getTitle()}
            </CardTitle>
            <p className="text-gray-600 text-sm">
              {getDescription()}
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
                    className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
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
                  className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  placeholder="Digite seu email"
                  required
                />
              </div>
            </div>
            
            {/* WhatsApp - apenas no cadastro e obrigatório */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
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
            
            {/* Senha - não mostrar na recuperação */}
            {!isResetPassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Digite sua senha"
                    required
                  />
                </div>
              </div>
            )}
            
            {/* Botão principal */}
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processando...
                </div>
              ) : (
                <>
                  {isResetPassword ? 'Enviar Link de Recuperação' : (isSignUp ? 'Criar Conta' : 'Entrar')}
                </>
              )}
            </Button>
          </form>
          
          {/* Links de navegação */}
          <div className="space-y-4">
            {!isResetPassword && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-purple-600 hover:text-purple-700 hover:underline font-medium transition-colors"
                >
                  {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma'}
                </button>
              </div>
            )}

            {!isSignUp && !isResetPassword && setIsResetPassword && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsResetPassword(true)}
                  className="text-sm text-gray-600 hover:text-gray-700 hover:underline transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            )}

            {isResetPassword && setIsResetPassword && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPassword(false);
                    setEmail('');
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 hover:underline font-medium transition-colors"
                >
                  Voltar ao login
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
