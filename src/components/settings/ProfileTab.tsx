
import React from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneInput } from '@/components/ui/phone-input';
import { Info } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  subscription_status: string | null;
}

interface ProfileTabProps {
  user: User | null;
  profile: Profile | null;
  whatsappValue: string;
  loading: boolean;
  onWhatsappChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const ProfileTab = ({ 
  user, 
  profile, 
  whatsappValue, 
  loading, 
  onWhatsappChange, 
  onSubmit 
}: ProfileTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Perfil</CardTitle>
        <CardDescription>
          Atualize suas informações pessoais e de contato
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-lg">
              {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">{profile?.full_name || 'Usuário'}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <Separator />

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name || ''}
                placeholder="Digite seu nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-100 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500">
                O email não pode ser alterado
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <PhoneInput
              id="whatsapp"
              value={whatsappValue}
              onChange={(value) => onWhatsappChange(value || '')}
              className="w-full"
            />
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Importante:</strong> Este número será autorizado a enviar mensagens para a Mya, nossa assistente de IA. 
                Certifique-se de que é o número correto para receber notificações e interagir com o sistema.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
