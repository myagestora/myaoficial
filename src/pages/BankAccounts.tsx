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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas Bancárias</h1>
          <p className="text-muted-foreground">Gerencie suas contas bancárias</p>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankAccounts.map((account) => (
          <Card key={account.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                  {account.is_default && (
                    <Badge variant="secondary">Padrão</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Saldo</span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatBalance(getAccountBalance(account.id, account.balance))}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <Badge variant="outline">
                    {getAccountTypeLabel(account.type)}
                  </Badge>
                </div>

                {account.bank_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Banco</span>
                    <span className="text-sm text-foreground">{account.bank_name}</span>
                  </div>
                )}

                {account.account_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Número</span>
                    <span className="text-sm text-foreground">{account.account_number}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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