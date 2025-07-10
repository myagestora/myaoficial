
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoUpload } from '@/components/admin/LogoUpload';
import { FaviconUpload } from '@/components/admin/FaviconUpload';

interface BrandingSettingsProps {
  settings: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
  onLogoChange: (newUrl: string) => void;
  onFaviconChange: (newUrl: string) => void;
  onSave: () => void;
}

export const BrandingSettings = ({ 
  settings, 
  onInputChange, 
  onLogoChange, 
  onFaviconChange, 
  onSave 
}: BrandingSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações da Marca</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="app_name">Nome da Aplicação</Label>
          <Input
            id="app_name"
            value={settings.app_name || ''}
            onChange={(e) => onInputChange('app_name', e.target.value)}
            placeholder="Ex: MYA Gestora"
          />
        </div>

        <LogoUpload 
          currentLogoUrl={settings.app_logo || ''}
          onLogoChange={onLogoChange}
          onSave={onSave}
        />

        <FaviconUpload 
          currentFaviconUrl={settings.app_favicon || ''}
          onFaviconChange={onFaviconChange}
        />
      </CardContent>
    </Card>
  );
};
