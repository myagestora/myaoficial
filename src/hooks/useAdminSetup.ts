
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminSetup = () => {
  useEffect(() => {
    const createAdminUser = async () => {
      try {
        console.log('Checking for admin user...');
        
        // Verificar se o admin já existe na tabela profiles
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', 'adm@myagestora.com.br')
          .maybeSingle();

        console.log('Existing admin profile:', existingProfile, profileError);

        if (!existingProfile) {
          console.log('Admin profile not found in profiles table');
          
          // Verificar se existe na auth.users (usando uma query que não requer admin)
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: 'adm@myagestora.com.br',  
            password: 'test-password' // senha fake só para testar se o usuário existe
          });
          
          // Se o erro não for "invalid_credentials", significa que o usuário não existe
          if (signInError && signInError.message !== 'Invalid login credentials') {
            console.log('Admin user does not exist, needs to be created by migration');
          } else {
            console.log('Admin user exists in auth but not in profiles - this should be fixed by migration');
          }
        } else {
          console.log('Admin profile already exists:', existingProfile);
          
          // Verificar se tem a role de admin
          const { data: adminRole } = await supabase
            .from('user_roles')
            .select('id, role')
            .eq('user_id', existingProfile.id)
            .eq('role', 'admin')
            .maybeSingle();
            
          console.log('Admin role check:', adminRole);
        }
      } catch (error) {
        console.error('Error in admin user setup:', error);
      }
    };

    createAdminUser();
  }, []);
};
