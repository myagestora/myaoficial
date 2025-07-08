
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Goal } from '@/hooks/useGoals';

const addAmountSchema = z.object({
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
});

type AddAmountFormData = z.infer<typeof addAmountSchema>;

interface AddAmountDialogProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onAddAmount: (goalId: string, amount: number) => void;
}

export const AddAmountDialog = ({ goal, isOpen, onClose, onAddAmount }: AddAmountDialogProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddAmountFormData>({
    resolver: zodResolver(addAmountSchema),
  });

  const onSubmit = async (data: AddAmountFormData) => {
    if (!goal) return;
    
    await onAddAmount(goal.id, data.amount);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!goal) return null;

  const remaining = goal.target_amount - goal.current_amount;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Adicionar Valor à Meta</DialogTitle>
          <DialogDescription>
            Adicione um valor à meta "{goal.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Valor atual:</span>
                <span className="font-medium">
                  R$ {goal.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Meta:</span>
                <span className="font-medium">
                  R$ {goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Faltam:</span>
                <span className="font-medium text-blue-600">
                  R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor a Adicionar</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adicionando...' : 'Adicionar Valor'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
