
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
        // Cadastro de novo usuário
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
        
        if (error) {
          if (error.message === 'User already registered') {
            toast({
              title: 'Erro',
              description: 'Já existe um usuário cadastrado com este email.',
              variant: 'destructive',
            });
          } else {
            throw error;
          }
          return;
        }
        
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
        console.log('🔐 Fazendo login...');
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('❌ Erro de login:', error);
          
          let errorMessage = 'Email ou senha incorretos.';
          if (email === 'adm@myagestora.com.br') {
            errorMessage = 'Credenciais do admin incorretas. Verifique email e senha.';
          }
          
          toast({
            title: 'Erro de Login',
            description: errorMessage,
            variant: 'destructive',
          });
          return;
        }
        
        console.log('✅ Login realizado com sucesso!');
        
        toast({
          title: 'Sucesso',
          description: 'Login realizado com sucesso!',
        });
        
        navigate('/');
      }
    } catch (error: any) {
      console.error('💥 Erro na autenticação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro na autenticação',
        variant: 'destructive',
      });
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
