
import React from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Clock } from 'lucide-react';

interface PixDisplayProps {
  pixData: {
    qr_code?: string;
    qr_code_base64?: string;
    payment_id?: number;
  };
  currentPrice: number;
  isWaitingPayment: boolean;
  onClose: () => void;
}

export const PixDisplay = ({ pixData, currentPrice, isWaitingPayment, onClose }: PixDisplayProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <QrCode className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Pagamento PIX</h3>
          {isWaitingPayment && (
            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <Clock className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Aguardando...</span>
            </div>
          )}
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {isWaitingPayment 
            ? 'Escaneie o QR Code para finalizar o pagamento. Verificando automaticamente...'
            : 'Escaneie o QR Code abaixo para finalizar o pagamento'
          }
        </p>
        
        {pixData.qr_code_base64 && (
          <div className="flex justify-center mb-4">
            <img 
              src={`data:image/png;base64,${pixData.qr_code_base64}`}
              alt="QR Code PIX"
              className="max-w-xs"
            />
          </div>
        )}
        
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
          <p className="text-sm font-medium mb-2">Código PIX:</p>
          <code className="text-xs break-all bg-white dark:bg-gray-900 p-2 rounded border block">
            {pixData.qr_code}
          </code>
        </div>
        
        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Valor: <span className="font-bold">R$ {currentPrice}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isWaitingPayment 
              ? 'Assim que o pagamento for confirmado, você será redirecionado automaticamente.'
              : 'O pagamento será processado automaticamente após a confirmação.'
            }
          </p>
        </div>

        <Button onClick={onClose} variant="outline" className="w-full">
          Fechar
        </Button>
      </div>
    </div>
  );
};
