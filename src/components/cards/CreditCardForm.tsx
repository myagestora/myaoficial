import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCreditCards, type CreditCard, type CreateCreditCardData } from '@/hooks/useCreditCards';

const creditCardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  bank_name: z.string().optional(),
  last_four_digits: z.string().min(4, 'Deve ter 4 dígitos').max(4, 'Deve ter 4 dígitos').optional().or(z.literal('')),
  credit_limit: z.number().min(0, 'Limite deve ser positivo').optional(),
  due_date: z.number().min(1, 'Dia deve estar entre 1 e 31').max(31, 'Dia deve estar entre 1 e 31').optional(),
  is_default: z.boolean().optional(),
  color: z.string().optional(),
});

type CreditCardFormData = z.infer<typeof creditCardSchema>;

interface CreditCardFormProps {
  card?: CreditCard | null;
  onSuccess: () => void;
}

export const CreditCardForm = ({ card, onSuccess }: CreditCardFormProps) => {
  const { createCreditCard, updateCreditCard, creditCards } = useCreditCards();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreditCardFormData>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: card ? {
      name: card.name,
      bank_name: card.bank_name || '',
      last_four_digits: card.last_four_digits || '',
      credit_limit: card.credit_limit || undefined,
      due_date: card.due_date || undefined,
      is_default: card.is_default,
      color: card.color,
    } : {
      is_default: creditCards && creditCards.length === 0 ? true : false,
      color: '#EF4444',
    },
  });

  const watchedIsDefault = watch('is_default');
  const watchedColor = watch('color');

  const onSubmit = async (data: CreditCardFormData) => {
    try {
      const submitData = {
        ...data,
        last_four_digits: data.last_four_digits || undefined,
        credit_limit: data.credit_limit || undefined,
        due_date: data.due_date || undefined,
      };

      if (card) {
        await updateCreditCard.mutateAsync({
          id: card.id,
          ...submitData,
        });
      } else {
        await createCreditCard.mutateAsync(submitData as CreateCreditCardData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving credit card:', error);
    }
  };

  const colorOptions = [
    '#EF4444', // vermelho
    '#3B82F6', // azul
    '#10B981', // verde
    '#F59E0B', // laranja
    '#8B5CF6', // roxo
    '#EC4899', // rosa
    '#06B6D4', // ciano
    '#84CC16', // verde limão
    '#6366F1', // azul violeta
    '#F472B6', // rosa claro
    '#FBBF24', // amarelo
    '#A3E635', // verde claro
    '#F87171', // vermelho claro
    '#A21CAF', // roxo escuro
    '#F43F5E', // vermelho magenta
    '#0EA5E9', // azul claro
    '#F59E42', // laranja claro
    '#14B8A6', // teal
    '#E11D48', // vermelho escuro
    '#FDE68A', // amarelo pastel
    '#111827', // preto quase puro
    '#374151', // cinza escuro
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Cartão *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Ex: Cartão Banco XYZ"
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_name">Nome do Banco</Label>
        <Input
          id="bank_name"
          {...register('bank_name')}
          placeholder="Ex: Banco do Brasil"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="last_four_digits">Últimos 4 dígitos</Label>
        <Input
          id="last_four_digits"
          {...register('last_four_digits')}
          placeholder="1234"
          maxLength={4}
        />
        {errors.last_four_digits && (
          <p className="text-sm text-red-500">{errors.last_four_digits.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="credit_limit">Limite de Crédito</Label>
        <Input
          id="credit_limit"
          type="number"
          step="0.01"
          {...register('credit_limit', { valueAsNumber: true })}
          placeholder="0.00"
        />
        {errors.credit_limit && (
          <p className="text-sm text-red-500">{errors.credit_limit.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="due_date">Dia do Vencimento</Label>
        <Input
          id="due_date"
          type="number"
          min="1"
          max="31"
          {...register('due_date', { valueAsNumber: true })}
          placeholder="10"
        />
        {errors.due_date && (
          <p className="text-sm text-red-500">{errors.due_date.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2 w-full justify-start">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setValue('color', color)}
              className={`w-8 h-8 rounded-full border-2 ${
                watchedColor === color ? 'border-foreground' : 'border-border'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_default"
          checked={watchedIsDefault}
          onCheckedChange={(checked) => setValue('is_default', checked)}
        />
        <Label htmlFor="is_default">Definir como cartão padrão</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="submit"
          disabled={createCreditCard.isPending || updateCreditCard.isPending}
        >
          {createCreditCard.isPending || updateCreditCard.isPending
            ? 'Salvando...'
            : card
            ? 'Atualizar'
            : 'Criar Cartão'
          }
        </Button>
      </div>
    </form>
  );
};