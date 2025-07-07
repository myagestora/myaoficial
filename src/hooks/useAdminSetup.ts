
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminSetup = () => {
  useEffect(() => {
    const setupAdminUser = async () => {
      try {
        console.log('🔧 Configurando usuário admin...');
        
        // Primeiro, verificar se o admin já existe na auth.users
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const adminExists = existingUser?.users?.some(user => user.email === 'adm@myagestora.com.br');
        
        if (adminExists) {
          console.log('✅ Usuário admin já existe na auth.users');
          return;
        }
        
        console.log('🚀 Criando usuário admin...');
        
        // Criar o usuário admin usando signUp
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'adm@myagestora.com.br',
          password: 'mYa@adm2025',
          options: {
            data: {
              full_name: 'Fabiano Bim'
            }
          }
        });
        
        if (signUpError) {
          console.error('❌ Erro ao criar usuário admin:', signUpError);
          return;
        }
        
        console.log('✅ Usuário admin criado com sucesso:', signUpData);
        
        // Verificar se o usuário foi criado e tem ID
        if (signUpData.user?.id) {
          // Verificar se já tem role de admin
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', signUpData.user.id)
            .eq('role', 'admin')
            .maybeSingle();
            
          if (!roleData) {
            console.log('🔑 Adicionando role de admin...');
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: signUpData.user.id,
                role: 'admin'
              });
              
            if (roleError) {
              console.error('❌ Erro ao adicionar role admin:', roleError);
            } else {
              console.log('✅ Role de admin adicionada com sucesso');
            }
          }
        }
        
        // Fazer logout após a criação para não logar automaticamente
        await supabase.auth.signOut();
        
      } catch (error) {
        console.error('💥 Erro na configuração do admin:', error);
      }
    };

    setupAdminUser();
  }, []);
};
