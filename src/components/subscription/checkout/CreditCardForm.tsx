
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CardData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  cpf: string;
}

interface CreditCardFormProps {
  cardData: CardData;
  onCardDataChange: (data: CardData) => void;
}

export const CreditCardForm = ({ cardData, onCardDataChange }: CreditCardFormProps) => {
  const updateCardData = (field: keyof CardData, value: string) => {
    onCardDataChange({ ...cardData, [field]: value });
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <Label className="text-sm font-medium">Dados do Cartão:</Label>
      <div className="space-y-4">
        {/* Número e Nome do Cartão */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cardNumber" className="text-sm">Número do Cartão</Label>
            <Input
              id="cardNumber"
              placeholder="0000 0000 0000 0000"
              value={cardData.cardNumber}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                updateCardData('cardNumber', value);
              }}
              maxLength={19}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cardholderName" className="text-sm">Nome no Cartão</Label>
            <Input
              id="cardholderName"
              placeholder="Nome completo"
              value={cardData.cardholderName}
              onChange={(e) => updateCardData('cardholderName', e.target.value.toUpperCase())}
              className="mt-1"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="expirationMonth" className="text-sm">Mês</Label>
            <Input
              id="expirationMonth"
              placeholder="MM"
              maxLength={2}
              value={cardData.expirationMonth}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateCardData('expirationMonth', value);
              }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="expirationYear" className="text-sm">Ano</Label>
            <Input
              id="expirationYear"
              placeholder="AAAA"
              maxLength={4}
              value={cardData.expirationYear}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateCardData('expirationYear', value);
              }}
              className="mt-1"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="securityCode" className="text-sm">CVV</Label>
            <Input
              id="securityCode"
              placeholder="000"
              maxLength={4}
              value={cardData.securityCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                updateCardData('securityCode', value);
              }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cpf" className="text-sm">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cardData.cpf}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                updateCardData('cpf', value);
              }}
              maxLength={14}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
