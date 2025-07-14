import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getWebhookUrl } from '@/integrations/supabase/client';

interface PaymentSettingsDynamicProps {
  settings: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
}

export const PaymentSettingsDynamic = ({ settings, onInputChange }: PaymentSettingsDynamicProps) => {
  const [webhookUrls, setWebhookUrls] = useState({
    subscription: '',
    payment: ''
  });

  useEffect(() => {
    const loadWebhookUrls = async () => {
      const [subscriptionUrl, paymentUrl] = await Promise.all([
        getWebhookUrl('mercado-pago-subscription-webhook'),
        getWebhookUrl('mercado-pago-webhook')
      ]);
      
      setWebhookUrls({
        subscription: subscriptionUrl,
        payment: paymentUrl
      });
    };

    loadWebhookUrls();
  }, []);

  const handleMercadoPagoEnabledChange = (checked: boolean) => {
    onInputChange('mercado_pago_enabled', checked.toString());
  };

  const copyWebhookUrl = async (url: string, type: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "URL copiada!",
        description: `URL do webhook ${type} copiada para a área de transferência.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a URL. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isMercadoPagoEnabled = settings.mercado_pago_enabled === 'true';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="mercado_pago_enabled"
            checked={isMercadoPagoEnabled}
            onCheckedChange={handleMercadoPagoEnabledChange}
          />
          <Label htmlFor="mercado_pago_enabled">Habilitar Mercado Pago</Label>
        </div>

        {isMercadoPagoEnabled && (
          <>
            <div>
              <Label htmlFor="mercado_pago_access_token">Access Token</Label>
              <Input
                id="mercado_pago_access_token"
                type="password"
                value={settings.mercado_pago_access_token || ''}
                onChange={(e) => onInputChange('mercado_pago_access_token', e.target.value)}
                placeholder="APP_USR-..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Token de acesso do Mercado Pago para produção
              </p>
            </div>

            <div>
              <Label htmlFor="mercado_pago_public_key">Public Key</Label>
              <Input
                id="mercado_pago_public_key"
                value={settings.mercado_pago_public_key || ''}
                onChange={(e) => onInputChange('mercado_pago_public_key', e.target.value)}
                placeholder="APP_USR-..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Chave pública do Mercado Pago
              </p>
            </div>

            <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <h4 className="font-medium mb-2">
                  ℹ️ Webhooks Disponíveis:
                </h4>
                <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                  <p><strong>Para Assinaturas:</strong></p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono bg-amber-100 dark:bg-amber-800 p-2 rounded text-xs break-all flex-1">
                      {webhookUrls.subscription}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyWebhookUrl(webhookUrls.subscription, 'de assinaturas')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p><strong>Para Pagamentos Únicos:</strong></p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono bg-amber-100 dark:bg-amber-800 p-2 rounded text-xs break-all flex-1">
                      {webhookUrls.payment}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyWebhookUrl(webhookUrls.payment, 'de pagamentos')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Configure os webhooks no Mercado Pago para receber notificações de pagamentos e assinaturas.
                Acesse: https://www.mercadopago.com.br/developers/panel/app → Suas integrações → Webhooks
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};