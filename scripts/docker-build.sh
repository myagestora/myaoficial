
#!/bin/bash

# Script para build e deploy com Docker

echo "🐳 Construindo imagem Docker..."

# Build da imagem
docker build -t mya-gestora:latest .

echo "✅ Imagem construída com sucesso!"

# Opcional: fazer push para registry
# docker tag mya-gestora:latest your-registry/mya-gestora:latest
# docker push your-registry/mya-gestora:latest

echo "🚀 Para executar o container:"
echo "docker run -p 3000:80 mya-gestora:latest"
echo ""
echo "🚀 Ou usar docker-compose:"
echo "docker-compose up -d"
