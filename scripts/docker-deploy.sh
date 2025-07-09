
#!/bin/bash

# Script para deploy automatizado

echo "🚀 Iniciando deploy com Docker Compose..."

# Parar containers existentes
docker-compose down

# Rebuild e iniciar
docker-compose up --build -d

echo "✅ Deploy concluído!"
echo "🌐 Aplicação disponível em: http://localhost:3000"

# Mostrar logs
docker-compose logs -f
