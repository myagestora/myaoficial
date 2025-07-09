
export const authenticateUser = async (supabaseClient: any, authHeader: string | null) => {
  if (!authHeader) {
    console.error('Token de autorização não fornecido');
    throw new Error('Token de autorização necessário');
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('Validando token de usuário...');
  
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError) {
    console.error('Erro de autenticação:', authError);
    throw new Error('Token inválido: ' + authError.message);
  }

  if (!user) {
    console.error('Usuário não encontrado');
    throw new Error('Usuário não autenticado');
  }

  console.log('Usuário autenticado:', user.id);
  return user;
};
