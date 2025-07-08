
import React from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface PreferencesTabProps {
  darkTheme: boolean;
  animations: boolean;
  notificationSound: boolean;
  onThemeToggle: (checked: boolean) => void;
  onAnimationsToggle: (checked: boolean) => void;
  onNotificationSoundToggle: (checked: boolean) => void;
}

export const PreferencesTab = ({
  darkTheme,
  animations,
  notificationSound,
  onThemeToggle,
  onAnimationsToggle,
  onNotificationSoundToggle
}: PreferencesTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências do Sistema</CardTitle>
        <CardDescription>
          Personalize sua experiência no aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Tema Escuro</Label>
            <p className="text-sm text-gray-500">
              Ativar tema escuro automaticamente
            </p>
          </div>
          <Switch 
            checked={darkTheme}
            onCheckedChange={onThemeToggle}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Animações</Label>
            <p className="text-sm text-gray-500">
              Habilitar animações na interface
            </p>
          </div>
          <Switch 
            checked={animations}
            onCheckedChange={onAnimationsToggle}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Som das Notificações</Label>
            <p className="text-sm text-gray-500">
              Reproduzir som ao receber notificações
            </p>
          </div>
          <Switch 
            checked={notificationSound}
            onCheckedChange={onNotificationSoundToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
};
