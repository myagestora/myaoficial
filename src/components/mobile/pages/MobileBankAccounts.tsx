import { useState } from 'react';
import { Plus, Edit, Trash2, DollarSign, CreditCard, Bank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBankAccounts, type BankAccount } from '@/hooks/useBankAccounts';
import { BankAccountForm } from '@/components/accounts/BankAccountForm';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/components/ui/use-toast';

export default function MobileBankAccounts() {
  const { bankAccounts, isLoading, deleteBankAccount } = useBankAccounts();
  const { transactions } = useTransactions();
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
    <div className="space-y-5 p-3 bg-[#F3F6FB] min-h-screen">
      {/* Header da seção */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100">
            <Bank className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Minhas contas</h2>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="bg-blue-600 text-white hover:bg-blue-700 shadow-md">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta Bancária'}</DialogTitle>
            </DialogHeader>
            <BankAccountForm account={editingAccount} onSuccess={handleCloseForm} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-4">
        {bankAccounts.map((account) => (
          <div key={account.id} className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-4 relative">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: account.color }}>
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-base text-gray-900 truncate">{account.name}</span>
                {account.is_default && <Badge variant="secondary">Padrão</Badge>}
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{getAccountTypeLabel(account.type)}</span>
                <span className="font-bold text-blue-700 text-lg">{formatBalance(getAccountBalance(account.id, account.balance))}</span>
              </div>
              {account.bank_name && (
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Banco</span>
                  <span className="text-xs text-gray-700">{account.bank_name}</span>
                </div>
              )}
              {account.account_number && (
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Número</span>
                  <span className="text-xs text-gray-700">{account.account_number}</span>
                </div>
              )}
            </div>
            <div className="absolute top-3 right-3 flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                <Edit className="w-5 h-5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
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
        ))}
        {bankAccounts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma conta cadastrada</h3>
            <p className="text-xs text-muted-foreground mb-2">Adicione sua primeira conta bancária para começar a organizar suas finanças.</p>
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700 shadow-md">
                  <Plus className="w-4 h-4 mr-1" />
                  Criar primeira conta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conta Bancária</DialogTitle>
                </DialogHeader>
                <BankAccountForm onSuccess={handleCloseForm} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
} 