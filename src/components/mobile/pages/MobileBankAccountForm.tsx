import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { BankAccountForm } from '@/components/accounts/BankAccountForm';

export default function MobileBankAccountForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { bankAccounts } = useBankAccounts();
  const isEditing = !!id;
  const account = isEditing ? bankAccounts.find(acc => acc.id === id) : null;

  return (
    <MobilePageWrapper className="bg-[#F6F8FA] min-h-screen p-2 space-y-3">
      {/* Header padrão mobile */}
      <div className="flex items-center gap-2 mb-1">
        <Button 
          variant="ghost" 
          size="icon"
          className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"
          onClick={() => navigate('/accounts')}
        >
          <ArrowLeft size={20} className="text-blue-700" />
        </Button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">{isEditing ? 'Editar Conta' : 'Nova Conta'}</h1>
          <p className="text-[11px] text-gray-400">Preencha os dados da conta bancária</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <BankAccountForm account={account} onSuccess={() => navigate('/accounts')} />
      </div>
    </MobilePageWrapper>
  );
} 