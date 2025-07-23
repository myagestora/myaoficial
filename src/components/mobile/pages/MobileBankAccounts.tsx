import { useState } from 'react';
import { Plus, Edit, Trash2, DollarSign, CreditCard, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBankAccounts, type BankAccount } from '@/hooks/useBankAccounts';
import { BankAccountForm } from '@/components/accounts/BankAccountForm';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

export default function MobileBankAccounts() {
  const { bankAccounts, isLoading, deleteBankAccount } = useBankAccounts();
  const { transactions } = useTransactions();
  const navigate = useNavigate();
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingAccount(null);
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(balance);
  };

  const getAccountTypeLabel = (type: string) => {
    const types = {
      checking: 'Conta Corrente',
      savings: 'Poupança',
      investment: 'Investimento',
    };
    return types[type as keyof typeof types] || type;
  };

  const getAccountBalance = (accountId: string, initialBalance: number) => {
    if (!transactions) return initialBalance;
    let saldo = initialBalance;
    transactions.forEach((t: any) => {
      if (t.account_id === accountId) {
        if (t.type === 'income') saldo += t.amount;
        if (t.type === 'expense') saldo -= t.amount;
      }
    });
    return saldo;
  };

  const handleDeleteError = (error: any) => {
    if (error?.message?.includes('violates foreign key constraint') || error?.message?.includes('transactions_account_id_fkey')) {
      toast({
        title: 'Não é possível excluir',
        description: 'Esta conta possui transações vinculadas. Exclua ou transfira as transações antes de remover a conta.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Erro ao excluir conta bancária',
        description: error.message || 'Ocorreu um erro ao tentar excluir a conta.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="p-4">Carregando contas...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-4">
      {/* Header padrão mobile com botão Nova Conta */}
      <div className="flex items-center gap-2 p-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Banknote className="w-5 h-5 text-blue-700" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-900">Contas</h1>
          <p className="text-[11px] text-gray-400">Gerencie suas contas bancárias</p>
        </div>
        <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md border-0 px-3 h-9 text-sm font-semibold gap-1" onClick={() => navigate('/accounts/nova')}>
          <Plus className="w-4 h-4" /> Nova
        </Button>
      </div>
      <div className="px-3 space-y-3">
        {bankAccounts.map((account) => (
          <div key={account.id} className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: account.color }}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-gray-900 truncate">{account.name}</span>
                  {account.is_default && <Badge variant="secondary">Padrão</Badge>}
                  {/* Botões editar/lixeira na linha do nome */}
                  <div className="flex gap-0.5 ml-auto">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/accounts/editar/${account.id}`)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="mx-2 w-full max-w-sm p-4 rounded-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir conta</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteBankAccount.mutate(account.id, { onError: handleDeleteError })}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{getAccountTypeLabel(account.type)}</span>
                  <span className="font-bold text-blue-700 text-base">{formatBalance(getAccountBalance(account.id, account.balance))}</span>
                </div>
                {account.bank_name && (
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-gray-400">Banco</span>
                    <span className="text-[11px] text-gray-700">{account.bank_name}</span>
                  </div>
                )}
                {account.account_number && (
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-gray-400">Número</span>
                    <span className="text-[11px] text-gray-700">{account.account_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {bankAccounts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma conta cadastrada</h3>
            <p className="text-xs text-muted-foreground mb-2">Adicione sua primeira conta bancária para começar a organizar suas finanças.</p>
          </div>
        )}
      </div>
    </div>
  );
} 