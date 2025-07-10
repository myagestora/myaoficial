export const getUserRole = (user: any) => {
  return user.user_roles?.some((role: any) => role.role === 'admin') ? 'admin' : 'user';
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Ativo';
    case 'inactive':
      return 'Inativo';
    case 'canceled':
      return 'Cancelado';
    case 'past_due':
      return 'Em Atraso';
    default:
      return 'Inativo';
  }
};

export const getStatusClassName = (status: string) => {
  switch (status) {
    case 'active':
      return 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400';
    case 'past_due':
      return 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400';
    case 'canceled':
      return 'border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-400';
    default:
      return 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-400';
  }
};