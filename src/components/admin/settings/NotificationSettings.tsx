
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';

interface NotificationSettingsProps {
  settings: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
}

export const NotificationSettings = ({ settings, onInputChange }: NotificationSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Notificações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="support_email">Email de Suporte</Label>
          <Input
            id="support_email"
            type="email"
            value={settings.support_email || ''}
            onChange={(e) => onInputChange('support_email', e.target.value)}
            placeholder="suporte@empresa.com"
          />
        </div>
        
        <div>
          <Label htmlFor="support_phone">Telefone de Suporte</Label>
          <PhoneInput
            id="support_phone"
            value={settings.support_phone || ''}
            onChange={(value) => onInputChange('support_phone', value || '')}
          />
        </div>
      </CardContent>
    </Card>
  );
};
