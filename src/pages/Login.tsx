
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AdminCredentialsCard } from '@/components/auth/AdminCredentialsCard';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAdminSetup } from '@/hooks/useAdminSetup';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  // Setup do usuário admin
  useAdminSetup();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Verificar se o usuário já existe consultando a tabela profiles pelo email
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingProfile) {
          toast({
            title: 'Erro',
            description: 'Já existe um usuário cadastrado com este email.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Criar o usuário
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              whatsapp: whatsapp
            }
          }
        });
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Conta criada com sucesso! Você já pode fazer login.',
        });
        
        // Resetar o formulário e voltar para login
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setFullName('');
        setWhatsapp('');
      } else {
        console.log('Attempting login with email:', email);
        
        // Fazer login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        console.log('Login result:', { data, error });
        
        if (error) {
          console.error('Login error details:', error);
          
          // Mensagem de erro mais específica
          let errorMessage = 'Erro ao fazer login';
          if (error.message === 'Invalid login credentials') {
            errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Email ainda não foi confirmado. Verifique sua caixa de entrada.';
          }
          
          toast({
            title: 'Erro de Login',
            description: errorMessage,
            variant: 'destructive',
          });
          
          throw error;
        }
        
        console.log('Login successful, navigating to home');
        
        toast({
          title: 'Sucesso',
          description: 'Login realizado com sucesso!',
        });
        
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      // O toast de erro já foi mostrado acima para o caso de login
      if (isSignUp) {
        toast({
          title: 'Erro',
          description: error.message || 'Erro ao criar conta',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-4">
        <AdminCredentialsCard />
        
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
