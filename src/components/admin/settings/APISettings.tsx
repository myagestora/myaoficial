import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface APISettingsProps {
  settings: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
}

export const APISettings = ({ settings, onInputChange }: APISettingsProps) => {
  const isApiEnabled = settings.api_enabled === 'true';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações da API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Configure um subdomínio personalizado para sua API (ex: api.seudominio.com.br). 
            Certifique-se de configurar o DNS e proxy para apontar para o Supabase.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-2">
          <Switch
            id="api_enabled"
            checked={isApiEnabled}
            onCheckedChange={(checked) => onInputChange('api_enabled', checked.toString())}
          />
          <Label htmlFor="api_enabled">Habilitar API Personalizada</Label>
        </div>

        {isApiEnabled && (
          <>
            <div>
              <Label htmlFor="api_domain">Domínio da API</Label>
              <Input
                id="api_domain"
                value={settings.api_domain || ''}
                onChange={(e) => onInputChange('api_domain', e.target.value)}
                placeholder="api.seudominio.com.br"
                type="url"
              />
              <p className="text-sm text-muted-foreground mt-1">
                URL completa que será usada na documentação da API
              </p>
            </div>

            <div>
              <Label htmlFor="api_title">Título da API</Label>
              <Input
                id="api_title"
                value={settings.api_title || ''}
                onChange={(e) => onInputChange('api_title', e.target.value)}
                placeholder="API WhatsApp Bot"
              />
            </div>

            <div>
              <Label htmlFor="api_description">Descrição da API</Label>
              <Textarea
                id="api_description"
                value={settings.api_description || ''}
                onChange={(e) => onInputChange('api_description', e.target.value)}
                placeholder="API para integração com WhatsApp Bot..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="api_version">Versão da API</Label>
              <Input
                id="api_version"
                value={settings.api_version || '1.0.0'}
                onChange={(e) => onInputChange('api_version', e.target.value)}
                placeholder="1.0.0"
              />
            </div>
          </>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Configuração do Servidor:</strong>
            <br />
            Configure um proxy no seu servidor para redirecionar as requisições:
            <br />
            <code className="text-xs bg-muted p-1 rounded">
              {settings.api_domain || 'api.seudominio.com'}/functions/v1/* → 
              https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1/*
            </code>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};