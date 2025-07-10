import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getUserRole } from '@/utils/userUtils';

export const useAdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchTerm, statusFilter, planFilter, roleFilter],
    queryFn: async () => {
      console.log('🔍 Fetching users with search term:', searchTerm);
      
      // Buscar perfis
      let profileQuery = supabase
        .from('profiles')
        .select('*');

      if (searchTerm) {
        profileQuery = profileQuery.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: profiles, error: profileError } = await profileQuery.order('created_at', { ascending: false });
      
      if (profileError) {
        console.error('❌ Error fetching profiles:', profileError);
        throw profileError;
      }

      console.log('📋 Profiles fetched:', profiles);

      // Buscar roles para cada usuário
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) {
        console.error('❌ Error fetching roles:', rolesError);
        throw rolesError;
      }

      console.log('🔐 User roles fetched:', userRoles);

      // Buscar assinaturas ativas dos usuários
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          status,
          subscription_plans (
            name,
            is_special
          )
        `)
        .eq('status', 'active');

      if (subscriptionsError) {
        console.error('❌ Error fetching subscriptions:', subscriptionsError);
      }

      console.log('📄 User subscriptions fetched:', subscriptions);

      // Combinar os dados
      const usersWithRolesAndPlans = profiles?.map(profile => {
        const userSubscription = subscriptions?.find(sub => sub.user_id === profile.id);
        return {
          ...profile,
          user_roles: userRoles?.filter(role => role.user_id === profile.id) || [],
          current_plan: userSubscription?.subscription_plans || null,
          is_special_plan: userSubscription?.subscription_plans?.is_special || false
        };
      }) || [];

      console.log('👥 Final users with roles and plans:', usersWithRolesAndPlans);

      return usersWithRolesAndPlans;
    }
  });

  // Filtrar usuários com base nos filtros aplicados
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter((user) => {
      // Filtro por status
      if (statusFilter !== 'all' && user.subscription_status !== statusFilter) {
        return false;
      }

      // Filtro por plano
      if (planFilter !== 'all') {
        if (planFilter === 'no_plan' && user.current_plan) {
          return false;
        }
        if (planFilter === 'special' && !user.is_special_plan) {
          return false;
        }
        if (planFilter === 'regular' && (user.is_special_plan || !user.current_plan)) {
          return false;
        }
        if (planFilter !== 'no_plan' && planFilter !== 'special' && planFilter !== 'regular') {
          if (!user.current_plan || user.current_plan.name !== planFilter) {
            return false;
          }
        }
      }

      // Filtro por tipo (admin/user)
      if (roleFilter !== 'all' && getUserRole(user) !== roleFilter) {
        return false;
      }

      return true;
    });
  }, [users, statusFilter, planFilter, roleFilter]);

  // Obter planos únicos para o filtro
  const availablePlans = useMemo(() => {
    if (!users) return [];
    
    const plansSet = new Set();
    const plans: { name: string; is_special: boolean }[] = [];
    
    users.forEach(user => {
      if (user.current_plan && !plansSet.has(user.current_plan.name)) {
        plansSet.add(user.current_plan.name);
        plans.push({
          name: user.current_plan.name,
          is_special: user.is_special_plan
        });
      }
    });
    
    return plans.sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setPlanFilter('all');
    setRoleFilter('all');
  };

  return {
    // Data
    users: filteredUsers,
    isLoading,
    availablePlans,
    
    // Search
    searchTerm,
    setSearchTerm,
    
    // Filters
    statusFilter,
    setStatusFilter,
    planFilter,
    setPlanFilter,
    roleFilter,
    setRoleFilter,
    handleClearFilters,
  };
};