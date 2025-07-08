
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
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primary_color">Cor Primária</Label>
            <div className="flex gap-2">
              <Input
                id="primary_color"
                type="color"
                value={settings.primary_color || '#3B82F6'}
                onChange={(e) => onInputChange('primary_color', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                value={settings.primary_color || '#3B82F6'}
                onChange={(e) => onInputChange('primary_color', e.target.value)}
                placeholder="#3B82F6"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="secondary_color">Cor Secundária</Label>
            <div className="flex gap-2">
              <Input
                id="secondary_color"
                type="color"
                value={settings.secondary_color || '#10B981'}
                onChange={(e) => onInputChange('secondary_color', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                value={settings.secondary_color || '#10B981'}
                onChange={(e) => onInputChange('secondary_color', e.target.value)}
                placeholder="#10B981"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
