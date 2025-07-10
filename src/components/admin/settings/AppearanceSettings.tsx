
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AppearanceSettingsProps {
  settings: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
}

export const AppearanceSettings = ({ settings, onInputChange }: AppearanceSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Aparência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="default_theme">Tema Padrão</Label>
          <select 
            id="default_theme"
            className="w-full p-2 border rounded-md"
            value={settings.default_theme || 'light'}
            onChange={(e) => onInputChange('default_theme', e.target.value)}
          >
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
            <option value="system">Sistema</option>
          </select>
        </div>
        
        <div>
          <Label htmlFor="currency_symbol">Símbolo da Moeda</Label>
          <Input
            id="currency_symbol"
            value={settings.currency_symbol || 'R$'}
            onChange={(e) => onInputChange('currency_symbol', e.target.value)}
          placeholder="R$"
        />
        </div>
        
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
