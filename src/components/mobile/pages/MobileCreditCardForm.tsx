import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useCreditCards } from '@/hooks/useCreditCards';
import { CreditCardForm } from '@/components/cards/CreditCardForm';

export default function MobileCreditCardForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { creditCards } = useCreditCards();
  const isEditing = !!id;
  const card = isEditing ? creditCards.find(c => c.id === id) : null;

  return (
    <MobilePageWrapper className="bg-[#F6F8FA] min-h-screen p-2 space-y-3">
      {/* Header padrão mobile */}
      <div className="flex items-center gap-2 mb-1">
        <Button 
          variant="ghost" 
          size="icon"
          className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"
          onClick={() => navigate('/cards')}
        >
          <ArrowLeft size={20} className="text-purple-700" />
        </Button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">{isEditing ? 'Editar Cartão' : 'Novo Cartão'}</h1>
          <p className="text-[11px] text-gray-400">Preencha os dados do cartão de crédito</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <CreditCardForm card={card} onSuccess={() => navigate('/cards')} />
      </div>
    </MobilePageWrapper>
  );
} 