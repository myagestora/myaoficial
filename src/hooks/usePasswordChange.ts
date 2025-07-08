
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const usePasswordChange = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('current_password') as string;
    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;
    
    if (!currentPassword) {
      toast({
        title: "Erro",
        description: "Digite sua senha atual.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
      // Primeiro, verificar se a senha atual está correta
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      
      if (signInError) {
        toast({
          title: "Erro",
          description: "Senha atual incorreta.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Se a senha atual estiver correta, atualizar para a nova senha
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível alterar a senha.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha alterada",
          description: "Sua senha foi alterada com sucesso!",
        });
        (e.target as HTMLFormElement).reset();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao verificar a senha atual.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  return { handlePasswordChange, loading };
};
