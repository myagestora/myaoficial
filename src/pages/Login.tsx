import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';
import { useQuery } from '@tanstack/react-query';
import { checkWhatsappExists } from '@/utils/whatsappValidation';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Verificar se há redirect após login
  const redirectTo = searchParams.get('redirect');

  // Buscar cor primária do sistema com tratamento de erro melhorado
  const { data: primaryColor } = useQuery({
    queryKey: ['system-config-login'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'primary_color')
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching primary color:', error);
          return '#3B82F6';
        }

        // Extrair o valor corretamente do JSON
        const colorValue = data?.value;
        if (typeof colorValue === 'string') {
          return colorValue.replace(/^"|"$/g, '');
        }
        return colorValue ? JSON.stringify(colorValue).replace(/^"|"$/g, '') : '#3B82F6';
      } catch (error) {
        console.error('Error in primary color query:', error);
        return '#3B82F6';
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetPassword) {
        // Recuperar senha
        console.log('🔐 Enviando email de recuperação para:', email);
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) {
          console.error('❌ Erro ao enviar email de recuperação:', error);
          toast({
            title: 'Erro',
            description: 'Erro ao enviar email de recuperação. Verifique o email informado.',
            variant: 'destructive',
          });
          return;
        }
        
        console.log('✅ Email de recuperação enviado!');
        toast({
          title: 'Sucesso',
          description: 'Email de recuperação enviado! Verifique sua caixa de entrada.',
        });
        
        setIsResetPassword(false);
        setEmail('');
      } else if (isSignUp) {
        // Cadastro de novo usuário
        console.log('📝 Tentando cadastrar usuário:', email);
        
        // Validar se WhatsApp já existe antes de tentar criar conta
        if (whatsapp && whatsapp.trim() !== '') {
          const whatsappExists = await checkWhatsappExists(whatsapp.trim());
          if (whatsappExists) {
            toast({
              title: 'WhatsApp já cadastrado',
              description: 'Este número de WhatsApp já está sendo usado por outro usuário.',
              variant: 'destructive',
            });
            return;
          }
        }
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
              whatsapp: whatsapp.trim() || null
            }
          }
        });
        
        if (error) {
          console.error('❌ Erro no cadastro:', error);
          toast({
            title: 'Erro no Cadastro',
            description: error.message === 'User already registered' 
              ? 'Já existe um usuário cadastrado com este email.'
              : 'Erro ao criar conta. Verifique os dados e tente novamente.',
            variant: 'destructive',
          });
          return;
        }
        
        console.log('✅ Cadastro realizado com sucesso!');
        toast({
          title: 'Sucesso',
          description: 'Conta criada com sucesso!',
        });
        
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setFullName('');
        setWhatsapp('');
      } else {
        // Login
        console.log('🔐 Tentando fazer login com:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('❌ Erro de login:', error);
          toast({
            title: 'Erro de Login',
            description: 'Email ou senha incorretos. Verifique suas credenciais.',
            variant: 'destructive',
          });
          return;
        }
        
        if (data.user) {
          console.log('✅ Login realizado com sucesso!', data.user.email);
          toast({
            title: 'Sucesso',
            description: 'Login realizado com sucesso!',
          });
          
          // Redirecionar para a página especificada ou dashboard
          if (redirectTo) {
            navigate(redirectTo);
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (error: any) {
      console.error('💥 Erro na autenticação:', error);
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
        <AuthForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          fullName={fullName}
          setFullName={setFullName}
          whatsapp={whatsapp}
          setWhatsapp={setWhatsapp}
          loading={loading}
          isSignUp={isSignUp}
          setIsSignUp={setIsSignUp}
          isResetPassword={isResetPassword}
          setIsResetPassword={setIsResetPassword}
          onSubmit={handleAuth}
          onBackToHome={() => navigate('/')}
        />
      </div>
    </div>
  );
};

export default Login;
