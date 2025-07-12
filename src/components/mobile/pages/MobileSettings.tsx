import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  HelpCircle,
  LogOut,
  ChevronRight,
  Crown,
  CreditCard
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const MobileSettings = () => {
  const { user, signOut } = useAuth();

  // Buscar perfil do usuário
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
  const { subscription } = useSubscription();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const settingsSections = [
    {
      title: 'Conta',
      items: [
        { icon: User, label: 'Perfil', action: () => {}, hasChevron: true },
        { icon: CreditCard, label: 'Assinatura', badge: subscription?.status === 'active' ? 'Ativo' : 'Inativo', action: () => {}, hasChevron: true },
        { icon: Shield, label: 'Segurança', action: () => {}, hasChevron: true },
      ]
    },
    {
      title: 'Preferências',
      items: [
        { icon: Bell, label: 'Notificações', hasSwitch: true, switchValue: true },
        { icon: Palette, label: 'Aparência', action: () => {}, hasChevron: true },
      ]
    },
    {
      title: 'Suporte',
      items: [
        { icon: HelpCircle, label: 'Ajuda e Suporte', action: () => {}, hasChevron: true },
      ]
    }
  ];

  return (
    <MobilePageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Settings className="h-6 w-6 mr-2" />
          Configurações
        </h1>
      </div>

      {/* Perfil do usuário */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {profile?.full_name ? getInitials(profile.full_name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{profile?.full_name || 'Usuário'}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge 
                  variant={subscription?.status === 'active' ? 'default' : 'secondary'}
                  className="flex items-center space-x-1"
                >
                  <Crown size={12} />
                  <span>{subscription?.status === 'active' ? 'Premium' : 'Gratuito'}</span>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {profile?.account_status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seções de configurações */}
      <div className="space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground uppercase text-xs tracking-wide">
              {section.title}
            </h2>
            <Card>
              <CardContent className="p-0">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={`flex items-center justify-between p-4 ${
                      itemIndex !== section.items.length - 1 ? 'border-b' : ''
                    } ${item.action ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
                    onClick={item.action}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon size={20} className="text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {item.badge && (
                        <Badge 
                          variant={item.badge === 'Ativo' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {item.hasSwitch && (
                        <Switch checked={item.switchValue} />
                      )}
                      {item.hasChevron && (
                        <ChevronRight size={16} className="text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Botão de sair */}
      <Card className="mt-6">
        <CardContent className="p-0">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 p-4 h-auto"
            onClick={signOut}
          >
            <LogOut size={20} className="mr-3" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>

      {/* Informações da versão */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          Mya Gestora v1.0.0
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          © 2025 Todos os direitos reservados
        </p>
      </div>
    </MobilePageWrapper>
  );
};