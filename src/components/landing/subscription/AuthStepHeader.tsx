
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ArrowLeft } from 'lucide-react';
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

interface AuthStepHeaderProps {
  selectedPlan: SubscriptionPlan;
  frequency: 'monthly' | 'yearly';
  isSignUp: boolean;
  onBack: () => void;
  onClose: () => void;
}

export const AuthStepHeader: React.FC<AuthStepHeaderProps> = ({
  selectedPlan,
  frequency,
  isSignUp,
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
  const price = frequency === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly;

  return (
    <CardHeader className="text-center space-y-4">
      {/* Botão de voltar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="absolute top-4 left-4 text-gray-600 hover:text-gray-800 z-50 bg-white/80 backdrop-blur-sm hover:bg-white/90 border border-gray-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Voltar
      </Button>

      {/* Botão de fechar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 z-50 bg-white/80 backdrop-blur-sm hover:bg-white/90 border border-gray-200"
      >
        ×
      </Button>


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
  );
};
