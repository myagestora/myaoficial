
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

  // Buscar dados do perfil
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('Buscando perfil para usuário:', user.id);
      
      try {
        // Tentar buscar o perfil existente
        const { data: existingProfile, error: selectError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, whatsapp, subscription_status')
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
        
        // Se não encontrou, retornar dados do usuário autenticado
        console.log('Perfil não encontrado, usando dados do usuário autenticado');
        const profileFromAuth = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || null,
          whatsapp: user.user_metadata?.whatsapp || user.user_metadata?.phone || '',
          subscription_status: 'inactive'
        };
        
        console.log('Usando dados do auth:', profileFromAuth);
        return profileFromAuth;
      } catch (error) {
        console.error('Erro na busca do perfil:', error);
        // Em caso de erro, retornar dados básicos do usuário
        return {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || null,
          whatsapp: user.user_metadata?.whatsapp || user.user_metadata?.phone || '',
          subscription_status: 'inactive'
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
        // Tentar fazer upsert (inserir ou atualizar)
        const { data: upsertedData, error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            ...updates
          }, {
            onConflict: 'id'
          })
          .select()
          .maybeSingle();
        
        if (upsertError) {
          console.error('Erro ao fazer upsert do perfil:', upsertError);
          
          // Verificar se é erro de violação de unicidade
          if (upsertError.code === '23505' && upsertError.message.includes('profiles_whatsapp_unique_idx')) {
            throw new Error('Este número de WhatsApp já está sendo usado por outro usuário.');
          }
          
          throw upsertError;
        }
        
        console.log('Perfil atualizado com sucesso:', upsertedData);
        return upsertedData;
      } catch (error) {
        console.error('Erro na operação de upsert:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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
