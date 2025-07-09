
export const authenticateUser = async (supabaseClient: any, authHeader: string | null) => {
  if (!authHeader) {
    console.error('Token de autorização não fornecido');
    throw new Error('Token de autorização necessário');
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('Validando token de usuário... Token length:', token.length);
  
  if (!token || token.trim() === '') {
    console.error('Token vazio após processamento');
    throw new Error('Token de autorização inválido');
  }
  
  try {
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('Erro de autenticação:', authError);
      throw new Error('Token inválido: ' + authError.message);
    }

    if (!user) {
      console.error('Usuário não encontrado');
      throw new Error('Usuário não autenticado');
    }

    console.log('Usuário autenticado:', user.id, 'email:', user.email);
    return user;
    
  } catch (error) {
    console.error('Erro ao validar token:', error);
    throw new Error('Erro na validação do token: ' + error.message);
  }
};
