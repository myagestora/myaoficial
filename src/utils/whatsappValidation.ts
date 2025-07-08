
import { supabase } from '@/integrations/supabase/client';

export const checkWhatsappExists = async (whatsapp: string, currentUserId?: string): Promise<boolean> => {
  if (!whatsapp || whatsapp.trim() === '') {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp', whatsapp)
      .maybeSingle();

    if (error) {
      console.error('Erro ao verificar WhatsApp:', error);
      return false;
    }

    // Se encontrou um registro e não é o usuário atual, então já existe
    if (data && data.id !== currentUserId) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro na verificação do WhatsApp:', error);
    return false;
  }
};
