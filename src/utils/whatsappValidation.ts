
import { supabase } from '@/integrations/supabase/client';

export const checkWhatsappExists = async (whatsapp: string, excludeUserId?: string): Promise<boolean> => {
  // Se o WhatsApp estiver vazio ou for null, não validar
  if (!whatsapp || whatsapp.trim() === '') {
    return false;
  }

  try {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp', whatsapp.trim());

    // Excluir o usuário atual da verificação se fornecido
    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error checking WhatsApp:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkWhatsappExists:', error);
    return false;
  }
};
