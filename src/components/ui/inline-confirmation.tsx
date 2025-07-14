import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface InlineConfirmationProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

export const InlineConfirmation = ({
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'destructive'
}: InlineConfirmationProps) => {
  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 p-3 bg-card border rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">{message}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          variant={variant}
          size="sm"
          onClick={onConfirm}
          className="flex-1"
        >
          {confirmText}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1"
        >
          {cancelText}
        </Button>
      </div>
    </div>
  );
};