import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
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
      <div className="border border-gray-200 p-3 shadow-sm bg-teal-500 rounded-md">
        <div className="flex items-center gap-3">
          <WhatsAppIcon className="text-green-500" size={20} />
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 font-medium">Use pelo WhatsApp</span>
            <a href={`https://wa.me/${whatsappNumber || '5511999999999'}`} target="_blank" rel="noopener noreferrer" className="text-sm text-white-900 font-semibold hover:text-yellow-900 transition-colors">
              {whatsappNumber ? formatPhoneNumber(whatsappNumber) : '(11) 99999-9999'}
            </a>
          </div>
        </div>
      </div>
    </div>;
};