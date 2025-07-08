
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { CreditCard, DollarSign, Key, Globe } from 'lucide-react';

interface PaymentSettingsProps {
  settings: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
  onSave: () => void;
  isLoading?: boolean;
}

export const PaymentSettings = ({ settings, onInputChange, onSave, isLoading }: PaymentSettingsProps) => {
  const handleMercadoPagoEnabledChange = (checked: boolean) => {
    onInputChange('mercado_pago_enabled', checked.toString());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Configurações do Mercado Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar Mercado Pago</Label>
              <p className="text-sm text-gray-500">
                Habilita o processamento de pagamentos via Mercado Pago
              </p>
            </div>
            <Switch 
              checked={settings.mercado_pago_enabled === 'true'}
              onCheckedChange={handleMercadoPagoEnabledChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mercado_pago_public_key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Chave Pública (Public Key)
              </Label>
              <Input
                id="mercado_pago_public_key"
                value={settings.mercado_pago_public_key || ''}
                onChange={(e) => onInputChange('mercado_pago_public_key', e.target.value)}
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                type="text"
              />
              <p className="text-xs text-gray-500">
                Chave pública do Mercado Pago (pode ser exposta no frontend)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mercado_pago_access_token" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Token de Acesso (Access Token)
              </Label>
              <Input
                id="mercado_pago_access_token"
                value={settings.mercado_pago_access_token || ''}
                onChange={(e) => onInputChange('mercado_pago_access_token', e.target.value)}
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                type="password"
              />
              <p className="text-xs text-gray-500">
                Token de acesso privado do Mercado Pago (mantido no servidor)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mercado_pago_webhook_url" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                URL do Webhook
              </Label>
              <Input
                id="mercado_pago_webhook_url"
                value={settings.mercado_pago_webhook_url || ''}
                onChange={(e) => onInputChange('mercado_pago_webhook_url', e.target.value)}
                placeholder="https://seudominio.com/api/webhooks/mercado-pago"
                type="url"
              />
              <p className="text-xs text-gray-500">
                URL para receber notificações de pagamento do Mercado Pago
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Como configurar o Mercado Pago:
            </h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. Acesse o painel do Mercado Pago</li>
              <li>2. Vá em "Suas integrações" → "Credenciais"</li>
              <li>3. Copie a Public Key e o Access Token</li>
              <li>4. Configure o webhook para receber notificações</li>
              <li>5. Teste os pagamentos no ambiente de sandbox primeiro</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={onSave} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {isLoading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
