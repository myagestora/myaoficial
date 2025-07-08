import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { checkWhatsappExists } from '@/utils/whatsappValidation';

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
  onSubmit: (e: React.FormEvent) => void;
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
  onSubmit
}) => {
  const [whatsappError, setWhatsappError] = useState('');
  const [validatingWhatsapp, setValidatingWhatsapp] = useState(false);

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

  const handleWhatsappChange = async (value: string) => {
    setWhatsapp(value || '');
    setWhatsappError('');
    
    // Validar apenas no modo de cadastro e se o valor não estiver vazio
    if (isSignUp && value && value.trim() !== '') {
      setValidatingWhatsapp(true);
      try {
        const exists = await checkWhatsappExists(value);
        if (exists) {
          setWhatsappError('Este número de WhatsApp já está sendo usado por outro usuário.');
        }
      } catch (error) {
        console.error('Erro ao validar WhatsApp:', error);
      } finally {
        setValidatingWhatsapp(false);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar se há erro de WhatsApp antes de submeter
    if (isSignUp && whatsappError) {
      return;
    }
    
    onSubmit(e);
  };

  return (
    <Card>
      <CardHeader className="text-center">
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
              onLoad={() => {
                console.log('Logo carregado com sucesso');
              }}
            />
          ) : null}
          
          <div className={`flex items-center justify-center logo-fallback ${appLogo && appLogo.trim() !== '' ? 'hidden' : ''}`}>
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <DollarSign className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
        <CardTitle className="text-2xl">
          {isSignUp ? 'Criar Conta' : `Entrar no ${appName}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          {isSignUp && (
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <PhoneInput
                id="whatsapp"
                value={whatsapp}
                onChange={handleWhatsappChange}
              />
              {validatingWhatsapp && (
                <p className="text-sm text-gray-500 mt-1">Verificando disponibilidade...</p>
              )}
              {whatsappError && (
                <p className="text-sm text-red-500 mt-1">{whatsappError}</p>
              )}
            </div>
          )}
          
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || validatingWhatsapp || (isSignUp && !!whatsappError)}
          >
            {loading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
          </Button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary hover:underline"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
