
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminSetup = () => {
  useEffect(() => {
    const createAdminUser = async () => {
      try {
        console.log('🔍 Verificando usuário admin...');
        
        // Verificar se o admin já existe na tabela profiles
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', 'adm@myagestora.com.br')
          .maybeSingle();

        console.log('📋 Perfil admin existente:', existingProfile, profileError);

        // Verificar se tem role de admin
        if (existingProfile) {
          const { data: adminRole, error: roleError } = await supabase
            .from('user_roles')
            .select('id, role')
            .eq('user_id', existingProfile.id)
            .eq('role', 'admin')
            .maybeSingle();
            
          console.log('👤 Role de admin:', adminRole, roleError);
        }

        // Tentar fazer um teste de login para ver o que acontece
        console.log('🧪 Testando credenciais admin...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'adm@myagestora.com.br',
          password: 'mYa@adm2025'
        });
        
        if (error) {
          console.error('❌ Erro no teste de login:', error.message, error);
        } else {
          console.log('✅ Teste de login bem-sucedido!', data);
          // Fazer logout imediatamente após o teste
          await supabase.auth.signOut();
        }
        
      } catch (error) {
        console.error('💥 Erro na verificação do admin:', error);
      }
    };

    createAdminUser();
  }, []);
};
