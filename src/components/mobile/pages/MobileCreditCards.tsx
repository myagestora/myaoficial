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
import { useNavigate } from 'react-router-dom';

export default function MobileCreditCards() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-[#F6F8FA] pb-4">
      {/* Header padrão mobile com botão Novo Cartão */}
      <div className="flex items-center gap-2 p-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <CreditCardIcon className="w-5 h-5 text-purple-700" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-900">Cartões</h1>
          <p className="text-[11px] text-gray-400">Gerencie seus cartões de crédito</p>
        </div>
        <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md border-0 px-3 h-9 text-sm font-semibold gap-1" onClick={() => navigate('/cards/nova')}>
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>
      <div className="px-3 space-y-3">
        {creditCards.map((card) => {
          const saldoAtual = getCardBalance(card.id, card.current_balance);
          const utilizacao = card.credit_limit ? (saldoAtual / card.credit_limit) * 100 : 0;
          return (
            <div key={card.id} className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: card.color }}>
                  <CreditCardIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-gray-900 truncate">{card.name}</span>
                    {card.is_default && <Badge variant="secondary">Padrão</Badge>}
                    {/* Botões editar/lixeira na linha do nome */}
                    <div className="flex gap-0.5 ml-auto">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/cards/editar/${card.id}`)}>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Limite</span>
                    <span className="font-bold text-purple-700 text-base">{formatCurrency(card.credit_limit || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-gray-400">Utilização</span>
                    <span className="text-xs text-gray-700">{utilizacao.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1 mt-1">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(utilizacao, 100)}%`,
                        backgroundColor: utilizacao > 80 ? '#ef4444' : card.color
                      }}
                    />
                  </div>
                  {card.last_four_digits && (
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-gray-400">Final</span>
                      <span className="text-[11px] text-gray-700">**** {card.last_four_digits}</span>
                    </div>
                  )}
                  {card.due_date && (
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-gray-400">Vencimento</span>
                      <span className="text-[11px] text-gray-700">Dia {card.due_date}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {creditCards.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <CreditCardIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-base font-semibold text-foreground mb-1">Nenhum cartão cadastrado</h3>
            <p className="text-xs text-muted-foreground mb-2">Adicione seu primeiro cartão de crédito para controlar seus gastos.</p>
          </div>
        )}
      </div>
    </div>
  );
} 