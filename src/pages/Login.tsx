
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  // Criar usuário admin automaticamente na primeira execução
  useEffect(() => {
    const createAdminUser = async () => {
      try {
        console.log('Checking for admin user...');
        
        // Verificar se o admin já existe
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'adm@myagestora.com.br')
          .maybeSingle();

        if (!existingProfile) {
          console.log('Admin user not found, creating...');
          
          // Criar o usuário admin
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'adm@myagestora.com.br',
            password: 'mYa@adm2025',
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                full_name: 'Fabiano Bim'
              }
            }
          });

          if (signUpError) {
            console.error('Error creating admin user:', signUpError);
            return;
          }

          if (signUpData.user) {
            console.log('Admin user created:', signUpData.user.id);
            
            // Confirmar o email automaticamente
            const { error: confirmError } = await supabase.auth.admin.updateUserById(
              signUpData.user.id,
              { email_confirm: true }
            );

            if (confirmError) {
              console.error('Error confirming admin email:', confirmError);
            } else {
              console.log('Admin email confirmed');
            }
            
            // Adicionar role de admin
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert([
                {
                  user_id: signUpData.user.id,
                  role: 'admin'
                }
              ]);

            if (roleError) {
              console.error('Error adding admin role:', roleError);
            } else {
              console.log('Admin role added successfully');
            }
          }
        } else {
          console.log('Admin user already exists');
        }
      } catch (error) {
        console.error('Error in admin user creation:', error);
      }
    };

    createAdminUser();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Verificar se o usuário já existe consultando a tabela profiles pelo email
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingProfile) {
          toast({
            title: 'Erro',
            description: 'Já existe um usuário cadastrado com este email.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Criar o usuário sem verificação de email
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              whatsapp: whatsapp
            }
          }
        });
        
        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Conta criada com sucesso! Você já pode fazer login.',
        });
        
        // Resetar o formulário e voltar para login
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setFullName('');
        setWhatsapp('');
      } else {
        console.log('Attempting login with email:', email);
        
        // Verificar primeiro se o usuário existe na tabela profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', email)
          .maybeSingle();

        console.log('Profile data found:', profileData);
        
        if (!profileData) {
          toast({
            title: 'Erro',
            description: 'Usuário não encontrado. Verifique o email.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        console.log('Login result:', { data, error });
        
        if (error) {
          console.error('Login error details:', error);
          
          if (error.message.includes('Invalid login credentials')) {
            // Tentar reconfirmar o email do usuário admin
            if (email === 'adm@myagestora.com.br') {
              console.log('Attempting to fix admin user...');
              
              // Buscar o usuário admin na tabela auth
              const { data: userData } = await supabase.auth.admin.listUsers();
              const adminUser = userData.users?.find((u: any) => u.email === 'adm@myagestora.com.br');
              
              if (adminUser) {
                console.log('Admin user found, confirming email...');
                
                // Confirmar o email
                const { error: confirmError } = await supabase.auth.admin.updateUserById(
                  adminUser.id,
                  { email_confirm: true }
                );
                
                if (confirmError) {
                  console.error('Error confirming admin email:', confirmError);
                } else {
                  console.log('Admin email confirmed, try login again');
                  toast({
                    title: 'Usuário admin configurado',
                    description: 'Tente fazer login novamente.',
                  });
                }
              }
            }
          }
          
          throw error;
        }
        
        console.log('Login successful, navigating to home');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-4">
        {/* Credenciais do Admin para teste */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-800 mb-2">👤 Credenciais de Admin</h3>
            <div className="text-sm text-blue-700">
              <p><strong>Email:</strong> adm@myagestora.com.br</p>
              <p><strong>Senha:</strong> mYa@adm2025</p>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              <p>Se der erro de login, clique em "Entrar" novamente após alguns segundos.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isSignUp ? 'Criar Conta' : 'Entrar no MYA'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              {isSignUp && (
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <PhoneInput
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(value) => setWhatsapp(value || '')}
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
