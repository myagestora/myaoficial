
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const AdminCredentialsCard = () => {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <h3 className="font-semibold text-blue-800 mb-2">👤 Credenciais de Admin</h3>
        <div className="text-sm text-blue-700">
          <p><strong>Email:</strong> adm@myagestora.com.br</p>
          <p><strong>Senha:</strong> mYa@adm2025</p>
        </div>
        <div className="mt-2 text-xs text-blue-600">
          <p>Se der erro de login, clique em "Entrar" novamente após alguns segundos.</p>
        </div>
      </CardContent>
    </Card>
  );
};
