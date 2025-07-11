import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle } from 'lucide-react';
export const WhatsAppContactSection = () => {
  // Buscar número do WhatsApp do sistema
  const {
    data: whatsappNumber
  } = useQuery({
    queryKey: ['system-config-support-phone'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('system_config').select('value').eq('key', 'support_phone').maybeSingle();
        if (error) {
          console.error('Error fetching support phone:', error);
          return null;
        }
        const numberValue = data?.value;
        if (typeof numberValue === 'string') {
          return numberValue.replace(/^"|"$/g, '').replace(/\+/, '');
        }
        return numberValue ? JSON.stringify(numberValue).replace(/^"|"$/g, '').replace(/\+/, '') : null;
      } catch (error) {
        console.error('Error in support phone query:', error);
        return null;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Buscar cor secundária do sistema
  const {
    data: secondaryColor
  } = useQuery({
    queryKey: ['system-config-secondary-color'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('system_config').select('value').eq('key', 'secondary_color').maybeSingle();
        if (error) {
          console.error('Error fetching secondary color:', error);
          return '#059669'; // cor padrão (emerald-600)
        }
        const colorValue = data?.value;
        if (typeof colorValue === 'string') {
          return colorValue.replace(/^"|"$/g, '');
        }
        return colorValue ? JSON.stringify(colorValue).replace(/^"|"$/g, '') : '#059669';
      } catch (error) {
        console.error('Error in secondary color query:', error);
        return '#059669';
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });
  const formatPhoneNumber = (phone: string) => {
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Formato brasileiro: (XX) XXXXX-XXXX
    if (cleanPhone.length >= 11) {
      return `(${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`;
    }
    return phone;
  };
  return <div className="px-3 pb-2">
      <div style={{
      backgroundColor: secondaryColor || '#059669'
    }} className="border border-gray-200/20 p-4 shadow-lg rounded-lg my-4 mx-4 backdrop-blur-sm bg-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <Whatsapp 
              className="h-5 w-5" 
              fill="currentColor" 
              style={{ color: secondaryColor || '#059669' }}
            />
          </div>
          <div className="flex flex-col font-sans">
            <span 
              className="text-xs font-medium tracking-wide"
              style={{ color: secondaryColor || '#059669' }}
            >
              Use pelo WhatsApp
            </span>
            <a 
              href={`https://wa.me/${whatsappNumber || '5511999999999'}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm font-medium hover:font-semibold transition-all duration-200 tracking-wide"
              style={{ color: secondaryColor || '#059669' }}
            >
              {whatsappNumber ? formatPhoneNumber(whatsappNumber) : '(11) 99999-9999'}
            </a>
          </div>
        </div>
      </div>
    </div>;
};