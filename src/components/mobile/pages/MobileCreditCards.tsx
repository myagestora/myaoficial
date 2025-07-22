import { useState } from 'react';
import { Plus, Edit, Trash2, CreditCard as CreditCardIcon, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCreditCards, type CreditCard } from '@/hooks/useCreditCards';
import { CreditCardForm } from '@/components/cards/CreditCardForm';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/components/ui/use-toast';

export default function MobileCreditCards() {
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
    return <div className="p-4">Carregando cartões...</div>;
  }

  return (
    <div className="space-y-5 p-3 bg-[#F3F6FB] min-h-screen">
      {/* Header da seção */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100">
            <CreditCardIcon className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Meus cartões</h2>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="bg-purple-600 text-white hover:bg-purple-700 shadow-md">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão de Crédito'}</DialogTitle>
            </DialogHeader>
            <CreditCardForm card={editingCard} onSuccess={handleCloseForm} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-4">
        {creditCards.map((card) => {
          const saldoAtual = getCardBalance(card.id, card.current_balance);
          const utilizacao = card.credit_limit ? (saldoAtual / card.credit_limit) * 100 : 0;
          return (
            <div key={card.id} className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-4 relative">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: card.color }}>
                <CreditCardIcon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base text-gray-900 truncate">{card.name}</span>
                  {card.is_default && <Badge variant="secondary">Padrão</Badge>}
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Limite</span>
                  <span className="font-bold text-purple-700 text-lg">{formatCurrency(card.credit_limit || 0)}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Utilização</span>
                  <span className="text-xs text-gray-700">{utilizacao.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${utilizacao}%`,
                      backgroundColor: utilizacao > 80 ? '#ef4444' : card.color
                    }}
                  />
                </div>
                {card.last_four_digits && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Final</span>
                    <span className="text-xs text-gray-700">**** {card.last_four_digits}</span>
                  </div>
                )}
                {card.due_date && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Vencimento</span>
                    <span className="text-xs text-gray-700">Dia {card.due_date}</span>
                  </div>
                )}
              </div>
              <div className="absolute top-3 right-3 flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(card)}>
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
          );
        })}
        {creditCards.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Banknote className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-base font-semibold text-foreground mb-1">Nenhum cartão cadastrado</h3>
            <p className="text-xs text-muted-foreground mb-2">Adicione seu primeiro cartão de crédito para controlar seus gastos.</p>
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-purple-600 text-white hover:bg-purple-700 shadow-md">
                  <Plus className="w-4 h-4 mr-1" />
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
          </div>
        )}
      </div>
    </div>
  );
} 