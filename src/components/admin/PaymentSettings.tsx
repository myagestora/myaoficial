
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { CreditCard, DollarSign, Key, Globe, Copy, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

  // URL correta da Edge Function do Supabase para webhook de assinatura
  const webhookUrl = 'https://api.myagestora.com.br/functions/v1/mercado-pago-subscription-webhook';

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast({
        title: 'URL copiada!',
        description: 'A URL do webhook foi copiada para a área de transferência.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar a URL.',
        variant: 'destructive',
      });
    }
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
              <Label htmlFor="mercado_pago_webhook_secret" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Assinatura Secreta do Webhook
              </Label>
              <Input
                id="mercado_pago_webhook_secret"
                value={settings.mercado_pago_webhook_secret || ''}
                onChange={(e) => onInputChange('mercado_pago_webhook_secret', e.target.value)}
                placeholder="3e66c81d067ec44c95311a0d73dd35efd098dd8d52be5d037aaa6f571527cb6d"
                type="password"
              />
              <p className="text-xs text-gray-500">
                Chave secreta fornecida pelo Mercado Pago para validar webhooks
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                URL do Webhook de Assinatura (Supabase Edge Function)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyWebhookUrl}
                  title="Copiar URL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Use esta URL para configurar o webhook de assinaturas no painel do Mercado Pago
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
              <li>4. Configure o webhook usando a URL correta acima</li>
              <li>5. Copie a assinatura secreta do webhook</li>
              <li>6. Selecione os eventos: subscription_preapproval, subscription_authorized_payment</li>
              <li>7. Teste as assinaturas no ambiente de sandbox primeiro</li>
            </ol>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
              ✅ URL Correta do Webhook de Assinatura:
            </h4>
            <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
              <p className="font-mono bg-green-100 dark:bg-green-800 p-2 rounded text-xs break-all">
                {webhookUrl}
              </p>
              <p><strong>Eventos necessários:</strong></p>
              <ul className="ml-4 list-disc">
                <li>subscription_preapproval (mudanças de status da assinatura)</li>
                <li>subscription_authorized_payment (pagamentos das assinaturas)</li>
              </ul>
              <p><strong>Importante:</strong> Use exatamente esta URL no painel do Mercado Pago para webhooks de assinatura!</p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
              ℹ️ Webhooks Disponíveis:
            </h4>
            <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
              <p><strong>Para Assinaturas:</strong></p>
              <p className="font-mono bg-amber-100 dark:bg-amber-800 p-2 rounded text-xs break-all">
                https://api.myagestora.com.br/functions/v1/mercado-pago-subscription-webhook
              </p>
              <p><strong>Para Pagamentos Únicos:</strong></p>
              <p className="font-mono bg-amber-100 dark:bg-amber-800 p-2 rounded text-xs break-all">
                https://api.myagestora.com.br/functions/v1/mercado-pago-webhook
              </p>
            </div>
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
