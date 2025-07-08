
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export const InstallPWAButton = () => {
  const { isInstallable, installPWA } = usePWA();

  if (!isInstallable) return null;

  return (
    <Button
      onClick={installPWA}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
    >
      <Download className="w-4 h-4" />
      Instalar App
    </Button>
  );
};
