
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Mail, Lock, User, Phone } from 'lucide-react';

interface AuthFormFieldsProps {
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
}

export const AuthFormFields: React.FC<AuthFormFieldsProps> = ({
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
  onSubmit
}) => {
  const handleWhatsappChange = (value: string) => {
    setWhatsapp(value || '');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Nome completo - apenas no cadastro */}
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 h-12"
                placeholder="Digite seu nome completo"
                required
              />
            </div>
          </div>
        )}
        
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              placeholder="Digite seu email"
              required
            />
          </div>
        </div>
        
        {/* WhatsApp - apenas no cadastro e obrigatório */}
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-sm font-medium">
              WhatsApp
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 z-10" />
              <PhoneInput
                id="whatsapp"
                value={whatsapp}
                onChange={handleWhatsappChange}
                className="pl-10"
                required
              />
            </div>
          </div>
        )}
        
        {/* Senha */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              placeholder="Digite sua senha"
              required
            />
          </div>
        </div>
        
        {/* Botão principal */}
        <Button 
          type="submit" 
          className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium" 
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Processando...
            </div>
          ) : (
            isSignUp ? 'Criar Conta e Continuar' : 'Entrar e Continuar'
          )}
        </Button>
      </form>
      
      {/* Link de navegação */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-purple-600 hover:text-purple-700 hover:underline font-medium"
        >
          {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma'}
        </button>
      </div>
    </div>
  );
};
