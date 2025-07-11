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
      backgroundColor: '#f9f9f9'
    }} className="border border-gray-200/20 p-4 shadow-lg rounded-lg my-4 mx-4 backdrop-blur-sm bg-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 32 32"
  className="h-10 w-10"
  fill="currentColor"
  style={{ color: secondaryColor || '#059669' }}
>
  <path d="M16.04 2C8.64 2.02 2.52 8.17 2.5 15.57c0 2.75.74 5.43 2.13 7.8L2 30l6.76-2.1a14.57 14.57 0 0 0 7.28 1.96h.06c7.4-.02 13.52-6.17 13.54-13.57.02-3.63-1.38-7.05-3.9-9.63A13.45 13.45 0 0 0 16.04 2zm0 24.63a12.3 12.3 0 0 1-6.28-1.72l-.45-.26-4.02 1.25 1.3-3.9-.29-.49a12.32 12.32 0 0 1-1.89-6.54c.02-6.79 5.54-12.3 12.32-12.3 3.3 0 6.4 1.29 8.73 3.63a12.22 12.22 0 0 1 3.6 8.71c-.02 6.8-5.54 12.32-12.32 12.32zm6.77-9.23c-.37-.19-2.2-1.08-2.55-1.2-.34-.12-.6-.19-.85.2-.25.37-.97 1.2-1.2 1.45-.23.24-.44.27-.82.09a10.2 10.2 0 0 1-3-1.84 11.08 11.08 0 0 1-2.05-2.55c-.22-.38 0-.58.17-.76.18-.17.38-.45.56-.67.18-.22.23-.38.34-.62.12-.24.06-.45-.03-.64-.1-.19-.85-2.06-1.16-2.83-.3-.73-.6-.63-.85-.64l-.72-.01a1.38 1.38 0 0 0-1 .45 4.2 4.2 0 0 0-1.33 3.11c0 1.83 1.3 3.6 1.49 3.85.2.24 2.56 4 6.2 5.61.87.37 1.55.6 2.08.77.87.28 1.65.24 2.27.15.7-.1 2.2-.9 2.5-1.77.31-.88.31-1.63.22-1.77-.1-.13-.34-.21-.7-.38z"/>
</svg>

          </div>
          <div className="flex flex-col font-sans">
            <span 
              className="text-xs font-medium tracking-wide"
              style={{ color: secondaryColor || '#059669' }}
            >
              Use pelo WhatsApp
            </span>
            <a 
              href={`https://wa.me/${whatsappNumber || '5531973035490'}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm font-medium hover:font-semibold transition-all duration-200 tracking-wide"
              style={{ color: secondaryColor || '#059669' }}
            >
              {whatsappNumber ? formatPhoneNumber(whatsappNumber) : '(31) 97303-5490'}
            </a>
          </div>
        </div>
      </div>
    </div>;
};