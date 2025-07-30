import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, ExternalLink, Code, Database, MessageSquare, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const CartRecoveryAPIDocs = () => {
  const [apiKey, setApiKey] = useState('your-service-role-key-here');
  const [baseUrl] = useState('https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1/cart-recovery-api');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/cart-recovery/abandoned',
      title: 'Listar Carrinhos Abandonados',
      description: 'Retorna todos os carrinhos abandonados com suas tentativas de recuperação.',
      example: `curl -X GET "${baseUrl}/api/cart-recovery/abandoned" \\
  -H "Authorization: Bearer ${apiKey}"`
    },
    {
      method: 'GET',
      path: '/api/cart-recovery/config',
      title: 'Obter Configurações',
      description: 'Retorna configurações de recuperação, templates e configurações do WhatsApp.',
      example: `curl -X GET "${baseUrl}/api/cart-recovery/config" \\
  -H "Authorization: Bearer ${apiKey}"`
    },
    {
      method: 'PUT',
      path: '/api/cart-recovery/session',
      title: 'Atualizar Status da Sessão',
      description: 'Atualiza o status de uma sessão de carrinho (completed, converted, abandoned).',
      example: `curl -X PUT "${baseUrl}/api/cart-recovery/session" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "session_123...",
    "status": "converted",
    "metadata": {
      "conversion_source": "whatsapp",
      "attempt_number": 1
    }
  }'`
    },
    {
      method: 'POST',
      path: '/api/cart-recovery/attempt',
      title: 'Registrar Tentativa de Envio',
      description: 'Registra uma tentativa de envio de mensagem de recuperação.',
      example: `curl -X POST "${baseUrl}/api/cart-recovery/attempt" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "session_123...",
    "attemptNumber": 1,
    "method": "whatsapp",
    "status": "sent",
    "messageContent": "Mensagem enviada...",
    "messageId": "whatsapp-message-id"
  }'`
    }
  ];

  const variables = [
    { variable: '{{user_name}}', description: 'Nome do usuário' },
    { variable: '{{plan_name}}', description: 'Nome do plano' },
    { variable: '{{amount}}', description: 'Valor do plano (ex: R$ 29,90)' },
    { variable: '{{frequency}}', description: 'Frequência (mês/ano)' },
    { variable: '{{original_amount}}', description: 'Valor original' },
    { variable: '{{discount_amount}}', description: 'Valor com desconto' },
    { variable: '{{final_amount}}', description: 'Valor final' },
    { variable: '{{checkout_url}}', description: 'URL de checkout personalizada' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API de Recuperação de Carrinho</h2>
          <p className="text-gray-600">
            Documentação completa para integração externa com o sistema de recuperação de carrinhos.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          API REST
        </Badge>
      </div>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          <strong>API Key:</strong> Use a <strong>Service Role Key</strong> do Supabase Dashboard → Settings → API.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">
            <Code className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="variables">
            <MessageSquare className="h-4 w-4 mr-2" />
            Variáveis
          </TabsTrigger>
          <TabsTrigger value="examples">
            <Database className="h-4 w-4 mr-2" />
            Exemplos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Label htmlFor="api-key">Sua Service Role Key:</Label>
              <Input
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="max-w-md"
                placeholder="sua-service-role-key-aqui"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(apiKey, 'Service Role Key')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>

            {endpoints.map((endpoint, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {endpoint.path}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(endpoint.example, 'Exemplo')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <CardTitle className="text-lg">{endpoint.title}</CardTitle>
                  <p className="text-gray-600">{endpoint.description}</p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={endpoint.example}
                    readOnly
                    className="font-mono text-sm"
                    rows={endpoint.example.split('\n').length}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Variáveis dos Templates</CardTitle>
              <p className="text-gray-600">
                Variáveis disponíveis para uso nos templates de mensagem.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {variables.map((variable, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <code className="text-sm bg-blue-50 px-2 py-1 rounded">
                      {variable.variable}
                    </code>
                    <span className="text-gray-600">{variable.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exemplo de Implementação</CardTitle>
              <p className="text-gray-600">
                Script JavaScript para processar carrinhos abandonados.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={`// Exemplo de script para processar carrinhos abandonados
async function processAbandonedCarts() {
  const API_KEY = '${apiKey}';
  const BASE_URL = '${baseUrl}';

  // 1. Buscar carrinhos abandonados
  const abandonedResponse = await fetch(\`\${BASE_URL}/api/cart-recovery/abandoned\`, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  const { data: abandonedCarts } = await abandonedResponse.json();

  // 2. Buscar configurações
  const configResponse = await fetch(\`\${BASE_URL}/api/cart-recovery/config\`, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  const { data: config } = await configResponse.json();

  // 3. Processar cada carrinho
  for (const cart of abandonedCarts) {
    const attempts = cart.attempts || [];
    const nextAttempt = attempts.length + 1;

    if (nextAttempt <= config.config.max_attempts) {
      // Enviar mensagem
      const template = config.templates.find(t => 
        t.name.includes(\`Tentativa \${nextAttempt}\`) && t.type === 'whatsapp'
      );

      if (template) {
        // Processar template e enviar
        const messageContent = processTemplate(template.content, cart);
        
        // Enviar via Evolution API
        const result = await sendWhatsApp(cart.user_whatsapp, messageContent);
        
        // Registrar tentativa
        await recordAttempt(cart.session_id, nextAttempt, 'whatsapp', 'sent', messageContent);
      }
    }
  }
}`}
                readOnly
                className="font-mono text-sm"
                rows={25}
              />
              <Button
                className="mt-4"
                onClick={() => copyToClipboard(
                  `// Exemplo de script para processar carrinhos abandonados
async function processAbandonedCarts() {
  const API_KEY = '${apiKey}';
  const BASE_URL = '${baseUrl}';

  // 1. Buscar carrinhos abandonados
  const abandonedResponse = await fetch(\`\${BASE_URL}/api/cart-recovery/abandoned\`, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  const { data: abandonedCarts } = await abandonedResponse.json();

  // 2. Buscar configurações
  const configResponse = await fetch(\`\${BASE_URL}/api/cart-recovery/config\`, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  const { data: config } = await configResponse.json();

  // 3. Processar cada carrinho
  for (const cart of abandonedCarts) {
    const attempts = cart.attempts || [];
    const nextAttempt = attempts.length + 1;

    if (nextAttempt <= config.config.max_attempts) {
      // Enviar mensagem
      const template = config.templates.find(t => 
        t.name.includes(\`Tentativa \${nextAttempt}\`) && t.type === 'whatsapp'
      );

      if (template) {
        // Processar template e enviar
        const messageContent = processTemplate(template.content, cart);
        
        // Enviar via Evolution API
        const result = await sendWhatsApp(cart.user_whatsapp, messageContent);
        
        // Registrar tentativa
        await recordAttempt(cart.session_id, nextAttempt, 'whatsapp', 'sent', messageContent);
      }
    }
  }
}`,
                  'Exemplo de implementação'
                )}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Exemplo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 