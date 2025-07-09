
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { checkWhatsappExists } from '@/utils/whatsappValidation';

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [whatsappValue, setWhatsappValue] = useState('');

  // Função helper para criar perfil se não existir
  const ensureProfileExists = async () => {
    if (!user?.id) return null;

    console.log('Verificando/criando perfil para usuário:', user.id);
    
    // Tentar buscar o perfil existente
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, whatsapp, subscription_status, account_status')
      .eq('id', user.id)
      .maybeSingle();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Erro ao buscar perfil:', selectError);
      throw selectError;
    }
    
    // Se encontrou o perfil, retornar
    if (existingProfile) {
      console.log('Perfil encontrado:', existingProfile);
      return existingProfile;
    }
    
    // Se não encontrou, criar o perfil
    console.log('Perfil não encontrado, criando novo perfil...');
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      whatsapp: user.user_metadata?.whatsapp || user.user_metadata?.phone || '',
      account_status: 'active',
      subscription_status: 'inactive'
    };
    
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select('id, full_name, email, avatar_url, whatsapp, subscription_status, account_status')
      .single();
    
    if (insertError) {
      console.error('Erro ao criar perfil:', insertError);
      throw insertError;
    }
    
    console.log('Perfil criado com sucesso:', newProfile);
    return newProfile;
  };

  // Buscar dados do perfil
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        // Garantir que o perfil existe
        const profile = await ensureProfileExists();
        return profile;
      } catch (error) {
        console.error('Erro na busca/criação do perfil:', error);
        // Em caso de erro, retornar dados básicos do usuário
        return {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || null,
          whatsapp: user.user_metadata?.whatsapp || user.user_metadata?.phone || '',
          subscription_status: 'inactive',
          account_status: 'active'
        };
      }
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30000,
  });

  // Mutação para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!user?.id) throw new Error('User not found');
      
      // Validar WhatsApp único se foi fornecido
      if (updates.whatsapp && updates.whatsapp.trim() !== '') {
        console.log('Validando WhatsApp único:', updates.whatsapp);
        const whatsappExists = await checkWhatsappExists(updates.whatsapp, user.id);
        
        if (whatsappExists) {
          throw new Error('Este número de WhatsApp já está sendo usado por outro usuário.');
        }
      }
      
      console.log('Atualizando perfil com dados:', updates);
      
      try {
        // Garantir que o perfil existe antes de atualizar
        await ensureProfileExists();
        
        // Fazer a atualização
        const { data: updatedData, error: updateError } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Erro ao atualizar perfil:', updateError);
          
          // Verificar se é erro de violação de unicidade
          if (updateError.code === '23505' && updateError.message.includes('profiles_whatsapp_unique_idx')) {
            throw new Error('Este número de WhatsApp já está sendo usado por outro usuário.');
          }
          
          throw updateError;
        }
        
        console.log('Perfil atualizado com sucesso:', updatedData);
        return updatedData;
      } catch (error) {
        console.error('Erro na operação de atualização:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['account-status'] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error('Erro na mutação:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  return {
    profile,
    isLoading,
    error,
    whatsappValue,
    setWhatsappValue,
    updateProfileMutation
  };
};
