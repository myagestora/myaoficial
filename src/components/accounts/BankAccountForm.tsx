import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useBankAccounts, type BankAccount, type CreateBankAccountData } from '@/hooks/useBankAccounts';

const bankAccountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['checking', 'savings', 'investment']),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  balance: z.number().min(0, 'Saldo deve ser positivo').optional(),
  is_default: z.boolean().optional(),
  color: z.string().optional(),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccountFormProps {
  account?: BankAccount | null;
  onSuccess: () => void;
}

export const BankAccountForm = ({ account, onSuccess }: BankAccountFormProps) => {
  const { createBankAccount, updateBankAccount } = useBankAccounts();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: account ? {
      name: account.name,
      type: account.type,
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      balance: account.balance,
      is_default: account.is_default,
      color: account.color,
    } : {
      type: 'checking',
      balance: 0,
      is_default: false,
      color: '#3B82F6',
    },
  });

  const watchedType = watch('type');
  const watchedIsDefault = watch('is_default');
  const watchedColor = watch('color');

  const onSubmit = async (data: BankAccountFormData) => {
    try {
      if (account) {
        await updateBankAccount.mutateAsync({
          id: account.id,
          ...data,
        });
      } else {
        await createBankAccount.mutateAsync(data as CreateBankAccountData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving bank account:', error);
    }
  };

  const accountTypes = [
    { value: 'checking', label: 'Conta Corrente' },
    { value: 'savings', label: 'Poupança' },
    { value: 'investment', label: 'Investimento' },
  ];

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Conta *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Ex: Conta Corrente Banco XYZ"
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Conta *</Label>
        <Select value={watchedType} onValueChange={(value) => setValue('type', value as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {accountTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Label htmlFor="account_number">Número da Conta</Label>
        <Input
          id="account_number"
          {...register('account_number')}
          placeholder="Ex: 12345-6"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="balance">Saldo Inicial</Label>
        <Input
          id="balance"
          type="number"
          step="0.01"
          {...register('balance', { valueAsNumber: true })}
          placeholder="0.00"
        />
        {errors.balance && (
          <p className="text-sm text-red-500">{errors.balance.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex gap-2">
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
        <Label htmlFor="is_default">Definir como conta padrão</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="submit"
          disabled={createBankAccount.isPending || updateBankAccount.isPending}
        >
          {createBankAccount.isPending || updateBankAccount.isPending
            ? 'Salvando...'
            : account
            ? 'Atualizar'
            : 'Criar Conta'
          }
        </Button>
      </div>
    </form>
  );
};