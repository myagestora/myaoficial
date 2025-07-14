import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface DeleteRecurringTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteSingle: () => void;
  onDeleteSeries: () => void;
  transaction: any;
}

export const DeleteRecurringTransactionDialog = ({
  isOpen,
  onClose,
  onDeleteSingle,
  onDeleteSeries,
  transaction
}: DeleteRecurringTransactionDialogProps) => {
  const isPartOfSeries = transaction?.parent_transaction_id;

  if (!isPartOfSeries) {
    // Se não é parte de uma série, usar dialog simples
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteSingle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Transação Recorrente</AlertDialogTitle>
          <AlertDialogDescription>
            Esta transação faz parte de uma série recorrente. O que você deseja fazer?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              onDeleteSingle();
              onClose();
            }}
            className="justify-start"
          >
            <span className="font-medium">Excluir apenas esta transação</span>
            <span className="text-sm text-muted-foreground ml-2">
              (As outras transações da série permanecerão)
            </span>
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onDeleteSeries();
              onClose();
            }}
            className="justify-start"
          >
            <span className="font-medium">Excluir toda a série</span>
            <span className="text-sm text-muted-foreground ml-2">
              (Remove todas as transações desta recorrência)
            </span>
          </Button>
        </div>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};