
#!/bin/sh

# Script de entrada personalizado para Docker
# Pode ser usado para configurações dinâmicas antes de iniciar o Nginx

echo "Iniciando Mya Gestora..."

# Verificar se existem variáveis de ambiente necessárias
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

echo "Ambiente: $NODE_ENV"
echo "Iniciando servidor web..."

# Iniciar Nginx
exec "$@"
