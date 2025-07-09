
import { supabase } from '@/integrations/supabase/client';

export const checkWhatsappExists = async (whatsapp: string): Promise<boolean> => {
  // Se o WhatsApp estiver vazio ou for null, não validar
  if (!whatsapp || whatsapp.trim() === '') {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp', whatsapp.trim())
      .maybeSingle();

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
