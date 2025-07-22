import { useState } from 'react';
import { Plus, CreditCard as CreditCardIcon, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCreditCards, type CreditCard } from '@/hooks/useCreditCards';
import { CreditCardForm } from '@/components/cards/CreditCardForm';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/components/ui/use-toast';

export default function CreditCards() {
  const { creditCards, isLoading, deleteCreditCard } = useCreditCards();
  const { transactions } = useTransactions();
  const { toast } = useToast();
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingCard(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getUsagePercentage = (currentBalance: number, creditLimit?: number) => {
    if (!creditLimit || creditLimit === 0) return 0;
    return Math.min((currentBalance / creditLimit) * 100, 100);
  };

  const getCardBalance = (cardId: string, initialBalance: number) => {
    if (!transactions) return initialBalance;
    let saldo = 0;
    transactions.forEach((t: any) => {
      if (t.card_id === cardId && t.type === 'expense') {
        saldo += t.amount;
      }
    });
    return saldo;
  };

  const handleDeleteError = (error: any) => {
    if (error?.message?.includes('violates foreign key constraint') || error?.message?.includes('transactions_card_id_fkey')) {
      toast({
        title: 'Não é possível excluir',
        description: 'Este cartão possui transações vinculadas. Exclua ou transfira as transações antes de remover o cartão.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Erro ao excluir cartão de crédito',
        description: error.message || 'Ocorreu um erro ao tentar excluir o cartão.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Carregando cartões...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Gerencie seus cartões de crédito</p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCard ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
              </DialogTitle>
            </DialogHeader>
            <CreditCardForm
              card={editingCard}
              onSuccess={handleCloseForm}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creditCards.map((card) => {
          const saldoAtual = getCardBalance(card.id, card.current_balance);
          const utilizacao = card.credit_limit ? (saldoAtual / card.credit_limit) * 100 : 0;
          return (
            <Card key={card.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: card.color }}
                    />
                    <CardTitle className="text-lg">{card.name}</CardTitle>
                    {card.is_default && (
                      <Badge variant="secondary">Padrão</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(card)}
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
                          <AlertDialogTitle>Excluir cartão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCreditCard.mutate(card.id, { onError: handleDeleteError })}
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
                    <span className="text-sm text-muted-foreground">Saldo Atual</span>
                    <span className="text-lg font-semibold text-foreground">
                      {formatCurrency(saldoAtual)}
                    </span>
                  </div>

                  {card.credit_limit && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Limite</span>
                        <span className="text-sm text-foreground">
                          {formatCurrency(card.credit_limit)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Utilização</span>
                          <span className="text-sm text-foreground">
                            {utilizacao.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${utilizacao}%`,
                              backgroundColor: utilizacao > 80 ? '#ef4444' : card.color
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {card.bank_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Banco</span>
                      <span className="text-sm text-foreground">{card.bank_name}</span>
                    </div>
                  )}

                  {card.last_four_digits && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Final</span>
                      <span className="text-sm text-foreground">**** {card.last_four_digits}</span>
                    </div>
                  )}

                  {card.due_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Vencimento</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-foreground">Dia {card.due_date}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {creditCards.length === 0 && (
          <div className="col-span-full">
            <Card className="p-12 text-center">
              <CreditCardIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum cartão cadastrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Adicione seu primeiro cartão de crédito para controlar seus gastos.
              </p>
              <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeiro cartão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Cartão de Crédito</DialogTitle>
                  </DialogHeader>
                  <CreditCardForm onSuccess={handleCloseForm} />
                </DialogContent>
              </Dialog>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}