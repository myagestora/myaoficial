
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SecurityTabProps {
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const SecurityTab = ({ loading, onSubmit }: SecurityTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Segurança da Conta</CardTitle>
        <CardDescription>
          Altere sua senha e gerencie a segurança da sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Senha Atual</Label>
            <Input
              id="current_password"
              name="current_password"
              type="password"
              placeholder="Digite sua senha atual"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">Nova Senha</Label>
            <Input
              id="new_password"
              name="new_password"
              type="password"
              placeholder="Digite sua nova senha"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="Confirme sua nova senha"
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
