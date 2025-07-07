
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminSetup = () => {
  useEffect(() => {
    const setupAdminUser = async () => {
      try {
        console.log('🔧 Verificando usuário admin...');
        
        // Verificar se o perfil admin já existe
        const { data: adminProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', 'adm@myagestora.com.br')
          .maybeSingle();
        
        if (profileError) {
          console.error('❌ Erro ao verificar perfil admin:', profileError);
          return;
        }
        
        if (adminProfile) {
          console.log('✅ Perfil admin já existe');
          return;
        }
        
        console.log('🚀 Criando usuário admin...');
        
        // Criar o usuário admin
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
          if (signUpError.message === 'User already registered') {
            console.log('✅ Usuário admin já existe no auth');
            return;
          }
          console.error('❌ Erro ao criar usuário admin:', signUpError);
          return;
        }
        
        console.log('✅ Usuário admin criado com sucesso');
        
        // Fazer logout imediatamente após criar
        await supabase.auth.signOut();
        
      } catch (error) {
        console.error('💥 Erro na configuração do admin:', error);
      }
    };

    // Executar apenas uma vez
    setupAdminUser();
  }, []);
};
