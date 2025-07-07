
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminSetup = () => {
  useEffect(() => {
    const createAdminUser = async () => {
      try {
        console.log('Checking for admin user...');
        
        // Verificar se o admin já existe na tabela profiles
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'adm@myagestora.com.br')
          .maybeSingle();

        if (!existingProfile) {
          console.log('Admin profile not found, creating admin user...');
          
          // Primeiro, verificar se o usuário existe na auth mas sem profile
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const existingAuthUser = authUsers.users?.find((u: any) => u.email === 'adm@myagestora.com.br');
          
          if (existingAuthUser) {
            console.log('Admin auth user exists, creating profile...');
            
            // Criar o perfil manualmente
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: existingAuthUser.id,
                full_name: 'Fabiano Bim',
                email: 'adm@myagestora.com.br'
              });

            if (profileError) {
              console.error('Error creating admin profile:', profileError);
            } else {
              console.log('Admin profile created successfully');
            }

            // Verificar e criar role de admin se não existir
            const { data: existingRole } = await supabase
              .from('user_roles')
              .select('id')
              .eq('user_id', existingAuthUser.id)
              .eq('role', 'admin')
              .maybeSingle();

            if (!existingRole) {
              const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                  user_id: existingAuthUser.id,
                  role: 'admin'
                });

              if (roleError) {
                console.error('Error adding admin role:', roleError);
              } else {
                console.log('Admin role added successfully');
              }
            }
          } else {
            console.log('No admin user found in auth, will be created by migration');
          }
        } else {
          console.log('Admin profile already exists');
        }
      } catch (error) {
        console.error('Error in admin user setup:', error);
      }
    };

    createAdminUser();
  }, []);
};
