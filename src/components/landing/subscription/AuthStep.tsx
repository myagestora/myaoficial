
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AuthStepHeader } from './AuthStepHeader';
import { AuthFormFields } from './AuthFormFields';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  features: string[];
}

interface AuthStepProps {
  selectedPlan: SubscriptionPlan;
  frequency: 'monthly' | 'yearly';
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  fullName: string;
  setFullName: (name: string) => void;
  whatsapp: string;
  setWhatsapp: (whatsapp: string) => void;
  loading: boolean;
  isSignUp: boolean;
  setIsSignUp: (isSignUp: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onClose: () => void;
}

export const AuthStep: React.FC<AuthStepProps> = ({
  selectedPlan,
  frequency,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  whatsapp,
  setWhatsapp,
  loading,
  isSignUp,
  setIsSignUp,
  onSubmit,
  onBack,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-2xl">
        <AuthStepHeader
          selectedPlan={selectedPlan}
          frequency={frequency}
          isSignUp={isSignUp}
          onBack={onBack}
          onClose={onClose}
        />

        <CardContent>
          <AuthFormFields
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            fullName={fullName}
            setFullName={setFullName}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            loading={loading}
            isSignUp={isSignUp}
            setIsSignUp={setIsSignUp}
            onSubmit={onSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
};
