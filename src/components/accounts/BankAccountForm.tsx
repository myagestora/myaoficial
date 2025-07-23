import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useBankAccounts, type BankAccount, type CreateBankAccountData } from '@/hooks/useBankAccounts';
import { SYSTEM_COLORS } from '@/lib/colors';
import { ChevronRight } from 'lucide-react';

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
  const { createBankAccount, updateBankAccount, bankAccounts } = useBankAccounts();

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
      is_default: bankAccounts && bankAccounts.length === 0 ? true : false,
      color: SYSTEM_COLORS[0],
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-1">
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <Label htmlFor="name">Nome da Conta *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Ex: Conta Corrente Banco XYZ"
            className="text-base"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1">
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
        <div className="space-y-1">
          <Label htmlFor="bank_name">Nome do Banco</Label>
          <Input
            id="bank_name"
            {...register('bank_name')}
            placeholder="Ex: Banco do Brasil"
            className="text-base"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="account_number">Número da Conta</Label>
          <Input
            id="account_number"
            {...register('account_number')}
            placeholder="Ex: 12345-6"
            className="text-base"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="balance">Saldo Inicial</Label>
          <Input
            id="balance"
            type="number"
            step="0.01"
            {...register('balance', { valueAsNumber: true })}
            placeholder="0.00"
            className="text-base"
          />
          {errors.balance && (
            <p className="text-sm text-destructive">{errors.balance.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Cor</Label>
          <div className="relative">
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 hide-scrollbar pr-8">
              {SYSTEM_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${watchedColor === color ? 'border-foreground scale-110' : 'border-muted-foreground/30'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            {/* Gradiente à direita */}
            <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white via-white/80 to-transparent" />
            {/* Ícone de seta */}
            <div className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 flex items-center justify-center">
              <ChevronRight size={18} className="text-muted-foreground/70" />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <Switch
            id="is_default"
            checked={watchedIsDefault}
            onCheckedChange={(checked) => setValue('is_default', checked)}
          />
          <Label htmlFor="is_default">Definir como conta padrão</Label>
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-12 text-base mt-2"
        disabled={createBankAccount.isPending || updateBankAccount.isPending}
      >
        {createBankAccount.isPending || updateBankAccount.isPending
          ? 'Salvando...'
          : account
          ? 'Atualizar'
          : 'Criar Conta'
        }
      </Button>
    </form>
  );
};