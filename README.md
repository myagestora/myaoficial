
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/c46de564-3ee4-45c1-9f4a-43d78557c5ef

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c46de564-3ee4-45c1-9f4a-43d78557c5ef) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Docker Deployment

Esta aplicação está preparada para ser executada em Docker.

### Requisitos

- Docker
- Docker Compose (opcional, mas recomendado)

### Deploy com Docker Compose (Recomendado)

```sh
# Build e iniciar os containers
docker-compose up --build -d

# Ver logs
docker-compose logs -f

# Parar os containers
docker-compose down
```

### Deploy com Docker apenas

```sh
# Build da imagem
docker build -t mya-gestora:latest .

# Executar o container
docker run -p 3000:80 mya-gestora:latest
```

### Scripts de Deploy

Para facilitar o deploy, use os scripts disponíveis:

```sh
# Tornar scripts executáveis (Linux/Mac)
chmod +x scripts/*.sh

# Build da imagem
./scripts/docker-build.sh

# Deploy completo
./scripts/docker-deploy.sh
```

### Acesso

Após o deploy, a aplicação estará disponível em:
- **Local**: http://localhost:3000
- **Produção**: Configure seu domínio no nginx.conf

### Configurações de Produção

1. **Variáveis de Ambiente**: Configure as variáveis necessárias no docker-compose.yml
2. **SSL/HTTPS**: Descomente e configure o nginx-proxy no docker-compose.yml para SSL
3. **Domínio**: Atualize o server_name no nginx.conf com seu domínio

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Docker & Nginx (for production)

## How can I deploy this project?

**Option 1: Lovable Hosting**
Simply open [Lovable](https://lovable.dev/projects/c46de564-3ee4-45c1-9f4a-43d78557c5ef) and click on Share -> Publish.

**Option 2: Docker**
Use the Docker setup described above for self-hosting.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
