
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { checkWhatsappExists } from '@/utils/whatsappValidation';

export const useAuthForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);

  const handleAuth = async (e: React.FormEvent, onSuccess: () => void) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validar se WhatsApp já existe antes de tentar criar conta
        if (whatsapp && whatsapp.trim() !== '') {
          const whatsappExists = await checkWhatsappExists(whatsapp.trim());
          if (whatsappExists) {
            toast({
              title: 'WhatsApp já cadastrado',
              description: 'Este número de WhatsApp já está sendo usado por outro usuário.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              whatsapp: whatsapp.trim() || null,
            }
          }
        });

        if (error) {
          toast({
            title: 'Erro no cadastro',
            description: error.message === 'User already registered' 
              ? 'Já existe um usuário cadastrado com este email.'
              : 'Erro ao criar conta. Verifique os dados e tente novamente.',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Conta criada!',
          description: 'Bem vindo(a) a MYA.',
        });
        
        onSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: 'Erro no login',
            description: 'Email ou senha incorretos. Verifique suas credenciais.',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Login realizado!',
          description: 'Redirecionando para o checkout...',
        });
        
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
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
    handleAuth,
  };
};
