
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';
import { useQuery } from '@tanstack/react-query';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

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
      if (isSignUp) {
        // Cadastro de novo usuário
        console.log('📝 Tentando cadastrar usuário:', email);
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
              whatsapp: whatsapp
            }
          }
        });
        
        if (error) {
          console.error('❌ Erro no cadastro:', error);
          toast({
            title: 'Erro no Cadastro',
            description: error.message === 'User already registered' 
              ? 'Já existe um usuário cadastrado com este email.'
              : error.message,
            variant: 'destructive',
          });
          return;
        }
        
        console.log('✅ Cadastro realizado com sucesso!');
        toast({
          title: 'Sucesso',
          description: 'Conta criada com sucesso! Você já pode fazer login.',
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
          navigate('/dashboard');
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
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: primaryColor || '#3B82F6' }}
    >
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
          onSubmit={handleAuth}
        />
      </div>
    </div>
  );
};

export default Login;
