
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowLeft, DollarSign, Eye, EyeOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Buscar configurações do sistema para logo e nome
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config-reset'],
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

  useEffect(() => {
    // Verificar se há parâmetros de recuperação de senha na URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      // Definir a sessão com os tokens da URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem. Verifique e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Tentando alterar senha...');
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        console.error('❌ Erro ao alterar senha:', error);
        toast({
          title: 'Erro ao alterar senha',
          description: 'Não foi possível alterar sua senha. Tente novamente ou solicite um novo link de recuperação.',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('✅ Senha alterada com sucesso!');
      toast({
        title: '🎉 Senha alterada com sucesso!',
        description: 'Sua senha foi atualizada. Você será redirecionado para o login.',
      });
      
      // Redirecionar para login após alguns segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error('💥 Erro na alteração de senha:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-300 to-blue-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="text-center space-y-4 pb-6">
            {/* Botão de voltar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="absolute top-4 left-4 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
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

            {/* Título e descrição */}
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Definir Nova Senha
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Digite sua nova senha para acessar sua conta
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Nova senha */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Digite sua nova senha"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Confirmar senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Confirme sua nova senha"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Botão de alterar senha */}
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Alterando Senha...
                  </div>
                ) : (
                  'Alterar Senha'
                )}
              </Button>
            </form>
            
            {/* Informações de segurança */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                🔒 Sua senha deve ter pelo menos 6 caracteres para garantir a segurança da sua conta.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
