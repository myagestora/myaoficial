import { useState } from 'react';
import { Plus, CreditCard, Edit, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBankAccounts, type BankAccount } from '@/hooks/useBankAccounts';
import { BankAccountForm } from '@/components/accounts/BankAccountForm';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/components/ui/use-toast';
import { ModernCard } from '@/components/ui/card';

export default function BankAccounts() {
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
    return <div className="p-6">Carregando contas...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header padrão */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-2">Contas Bancárias</h1>
          <p className="text-base md:text-lg text-muted-foreground">Gerencie suas contas bancárias</p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? 'Editar Conta' : 'Nova Conta Bancária'}
              </DialogTitle>
            </DialogHeader>
            <BankAccountForm
              account={editingAccount}
              onSuccess={handleCloseForm}
            />
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankAccounts.map((account) => (
          <ModernCard
            key={account.id}
            icon={<DollarSign className="w-6 h-6" />}
            iconBgColor={account.color}
            title={account.name}
            value={formatBalance(getAccountBalance(account.id, account.balance))}
            valueColor="text-blue-700"
            description={getAccountTypeLabel(account.type)}
            className="relative"
          >
            <div className="absolute top-4 right-4 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(account)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
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
            {account.is_default && (
              <Badge variant="secondary" className="absolute top-4 left-16">Padrão</Badge>
            )}
            <div className="flex flex-col gap-1 mt-2">
              {account.bank_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Banco</span>
                  <span className="text-foreground">{account.bank_name}</span>
                </div>
              )}
              {account.account_number && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Número</span>
                  <span className="text-foreground">{account.account_number}</span>
                  </div>
                )}
              </div>
          </ModernCard>
        ))}

        {bankAccounts.length === 0 && (
          <div className="col-span-full">
            <Card className="p-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma conta cadastrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Adicione sua primeira conta bancária para começar a organizar suas finanças.
              </p>
              <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
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
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}