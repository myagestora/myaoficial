
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
      </CardContent>
    </Card>
  );
};
