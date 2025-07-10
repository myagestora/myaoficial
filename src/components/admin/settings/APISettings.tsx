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
            Configure um subdomínio para sua API (ex: api.seudominio.com.br). 
            Lembre-se de configurar o DNS para apontar para o mesmo servidor.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-2">
          <Switch
            id="api_enabled"
            checked={isApiEnabled}
            onCheckedChange={(checked) => onInputChange('api_enabled', checked.toString())}
          />
          <Label htmlFor="api_enabled">Habilitar API</Label>
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
              />
              <p className="text-sm text-muted-foreground mt-1">
                Apenas o domínio (sem https://)
              </p>
            </div>
          </>
        )}

        {isApiEnabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Configuração do Servidor:</strong>
              <br />
              Configure um proxy no seu servidor para redirecionar:
              <br />
              <code className="text-xs bg-muted p-1 rounded">
                {settings.api_domain || 'api.seudominio.com'}/functions/v1/* → 
                https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1/*
              </code>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};