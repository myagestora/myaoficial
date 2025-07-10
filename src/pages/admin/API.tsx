import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Copy, 
  Key, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Check,
  Code,
  Shield,
  Zap,
  Database,
  TrendingUp,
  Activity,
  Plus,
  Trash2,
  Terminal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface APIKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
}

const AdminAPI = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Buscar API keys existentes
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      // Simular busca de API keys (você pode implementar uma tabela real)
      return [
        {
          id: '1',
          name: 'WhatsApp Bot Key',
          key: 'wba_' + Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
          is_active: true
        }
      ] as APIKey[];
    }
  });

  // Gerar nova API key
  const generateKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      // Simular geração de API key
      const newKey = {
        id: Date.now().toString(),
        name,
        key: 'wba_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString(),
        last_used: null,
        is_active: true
      };
      return newKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKeyName('');
      setIsCreatingKey(false);
      toast({
        title: "API Key criada",
        description: "Nova API Key gerada com sucesso.",
      });
    }
  });

  // Deletar API key
  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      // Simular remoção de API key
      return keyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: "API Key removida",
        description: "API Key removida com sucesso.",
      });
    }
  });

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${description} copiado para a área de transferência.`,
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskKey = (key: string) => {
    return key.substring(0, 8) + '••••••••' + key.substring(key.length - 4);
  };

  const generateCurlCommand = (endpoint: any) => {
    let fullUrl = `${baseUrl}${endpoint.path.replace('{userId}', 'USER_ID')}`;
    
    if (endpoint.method === 'GET') {
      // Adicionar parâmetros de URL para requisições GET
      if (endpoint.params && Object.keys(endpoint.params).length > 0) {
        const params = new URLSearchParams();
        Object.entries(endpoint.params).forEach(([key, type]) => {
          // Remover indicador opcional e definir valores de exemplo
          const cleanType = (type as string).replace('?', '');
          let exampleValue = '';
          
          if (cleanType === 'number') {
            exampleValue = key === 'limit' ? '10' : key === 'months' ? '6' : '1';
          } else if (cleanType === 'string') {
            if (key === 'period') exampleValue = 'month';
            else if (key === 'user_id') exampleValue = 'USER_ID';
            else exampleValue = 'example';
          }
          
          if (exampleValue) {
            params.append(key, exampleValue);
          }
        });
        
        if (params.toString()) {
          fullUrl += `?${params.toString()}`;
        }
      }
      
      let curl = `curl -X GET "${fullUrl}"`;
      if (endpoint.headers?.Authorization) {
        curl += ` \\\n  -H "Authorization: Bearer YOUR_BOT_TOKEN"`;
      }
      return curl;
    } else if (endpoint.method === 'POST') {
      let curl = `curl -X POST "${fullUrl}" \\\n  -H "Content-Type: application/json"`;
      if (endpoint.headers?.Authorization) {
        curl += ` \\\n  -H "Authorization: Bearer YOUR_BOT_TOKEN"`;
      }
      if (endpoint.params) {
        const exampleBody = { ...endpoint.params };
        // Definir valores de exemplo para o body
        Object.keys(exampleBody).forEach(key => {
          const type = exampleBody[key] as string;
          const cleanType = type.replace('?', '');
          
          if (cleanType === 'string') {
            if (key === 'user_id') exampleBody[key] = 'USER_ID';
            else if (key === 'type') exampleBody[key] = 'expense';
            else if (key === 'title') exampleBody[key] = 'Compra no mercado';
            else if (key === 'category_name') exampleBody[key] = 'Alimentação';
            else if (key === 'description') exampleBody[key] = 'Compras da semana';
            else if (key === 'date') exampleBody[key] = '2024-01-15';
            else if (key === 'whatsapp') exampleBody[key] = '5511999999999';
            else if (key === 'bot_token') exampleBody[key] = 'YOUR_BOT_TOKEN';
            else exampleBody[key] = 'example';
          } else if (cleanType === 'number') {
            exampleBody[key] = key === 'amount' ? 150.50 : 1;
          }
        });
        curl += ` \\\n  -d '${JSON.stringify(exampleBody, null, 2)}'`;
      }
      return curl;
    }
    return '';
  };

  const endpoints = [
    {
      category: "Autenticação",
      icon: Shield,
      color: "bg-blue-500",
      endpoints: [
        {
          method: "POST",
          path: "/whatsapp-auth",
          description: "Autentica usuário pelo WhatsApp",
          params: { whatsapp: "string", bot_token: "string" },
          response: { user_id: "string", session_token: "string", expires_at: "string" }
        }
      ]
    },
    {
      category: "Dados Financeiros",
      icon: Database,
      color: "bg-green-500",
      endpoints: [
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/balance",
          description: "Saldo atual do usuário",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          response: { balance: "number", total_income: "number", total_expenses: "number" }
        },
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/transactions",
          description: "Histórico de transações",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { limit: "number?", period: "string?" },
          response: { transactions: "array", total_count: "number" }
        },
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/expenses",
          description: "Resumo de despesas por categoria",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          response: { total_expenses: "number", by_category: "array" }
        },
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/income",
          description: "Resumo de receitas",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          response: { total_income: "number", transactions: "array" }
        },
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/goals",
          description: "Status das metas financeiras",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          response: { goals: "array", total_goals: "number" }
        },
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/summary",
          description: "Resumo financeiro completo",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          response: { balance: "number", monthly_balance: "number", active_goals: "number" }
        }
      ]
    },
    {
      category: "Analytics",
      icon: TrendingUp,
      color: "bg-purple-500",
      endpoints: [
        {
          method: "GET",
          path: "/user-analytics-api/user/{userId}/spending-trends",
          description: "Tendências de gastos mensais",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { months: "number?" },
          response: { trends: "array", period_months: "number" }
        },
        {
          method: "GET",
          path: "/user-analytics-api/user/{userId}/category-breakdown",
          description: "Gastos por categoria",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { period: "string?" },
          response: { income: "object", expenses: "object" }
        },
        {
          method: "GET",
          path: "/user-analytics-api/user/{userId}/monthly-comparison",
          description: "Comparação entre meses",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          response: { current_month: "object", previous_month: "object", comparison: "object" }
        }
      ]
    },
    {
      category: "Transações Rápidas",
      icon: Zap,
      color: "bg-orange-500",
      endpoints: [
        {
          method: "POST",
          path: "/quick-transaction",
          description: "Registra transação via WhatsApp",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { 
            user_id: "string", 
            title: "string", 
            amount: "number", 
            type: "string",
            category_name: "string?"
          },
          response: { success: "boolean", transaction: "object", updated_balance: "object" }
        }
      ]
    },
    {
      category: "Alertas",
      icon: Activity,
      color: "bg-red-500",
      endpoints: [
        {
          method: "GET",
          path: "/user-alerts",
          description: "Alertas sobre metas e gastos",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { user_id: "string" },
          response: { alerts: "array", total_alerts: "number" }
        }
      ]
    }
  ];

  const baseUrl = "https://fimgalqlsezgxqbmktpz.supabase.co/functions/v1";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground">
            Gerencie API keys e consulte a documentação completa da API WhatsApp
          </p>
        </div>
      </div>

      <Tabs defaultValue="documentation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documentation">Documentação</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="documentation" className="space-y-6">
          {/* Visão Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Visão Geral da API
              </CardTitle>
              <CardDescription>
                API REST para integração com agentes de IA WhatsApp. Todas as respostas são em formato JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium mb-2">Base URL:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-background px-2 py-1 rounded text-sm flex-1">
                    {baseUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(baseUrl, "Base URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="font-medium">Autenticação</p>
                  <p className="text-sm text-muted-foreground">Token baseado em bot</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Database className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="font-medium">Dados Financeiros</p>
                  <p className="text-sm text-muted-foreground">Saldo, transações, metas</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Zap className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <p className="font-medium">Tempo Real</p>
                  <p className="text-sm text-muted-foreground">Transações via WhatsApp</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endpoints por Categoria */}
          {endpoints.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <category.icon className="h-4 w-4 text-white" />
                  </div>
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.endpoints.map((endpoint, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={endpoint.method === 'GET' ? 'secondary' : 'default'}
                          className={endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                          {endpoint.path}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(`${baseUrl}${endpoint.path}`, "Endpoint")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {endpoint.description}
                      </p>

                      {endpoint.headers && (
                        <div className="mb-3">
                          <p className="text-sm font-medium mb-1">Headers:</p>
                          <div className="bg-muted p-2 rounded text-xs">
                            <pre>{JSON.stringify(endpoint.headers, null, 2)}</pre>
                          </div>
                        </div>
                      )}

                      {endpoint.params && (
                        <div className="mb-3">
                          <p className="text-sm font-medium mb-1">Parâmetros:</p>
                          <div className="bg-muted p-2 rounded text-xs">
                            <pre>{JSON.stringify(endpoint.params, null, 2)}</pre>
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium mb-1">Resposta:</p>
                        <div className="bg-muted p-2 rounded text-xs">
                          <pre>{JSON.stringify(endpoint.response, null, 2)}</pre>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">cURL:</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generateCurlCommand(endpoint), "Comando cURL")}
                          >
                            <Terminal className="h-3 w-3 mr-1" />
                            Copiar cURL
                          </Button>
                        </div>
                        <div className="bg-muted p-2 rounded text-xs">
                          <pre className="whitespace-pre-wrap text-wrap">{generateCurlCommand(endpoint)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="keys" className="space-y-6">
          {/* Criar Nova API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Gerenciar API Keys
              </CardTitle>
              <CardDescription>
                Crie e gerencie API keys para autenticação do bot WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isCreatingKey ? (
                <Button 
                  onClick={() => setIsCreatingKey(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nova API Key
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">Nome da API Key</Label>
                    <Input
                      id="keyName"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Ex: WhatsApp Bot Produção"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => generateKeyMutation.mutate(newKeyName)}
                      disabled={!newKeyName || generateKeyMutation.isPending}
                    >
                      {generateKeyMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Gerar Key"
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsCreatingKey(false);
                        setNewKeyName('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de API Keys */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : apiKeys && apiKeys.length > 0 ? (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{key.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Criada em {new Date(key.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant={key.is_active ? 'default' : 'secondary'}>
                          {key.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          value={showKeys[key.id] ? key.key : maskKey(key.key)}
                          readOnly
                          className="flex-1 font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {showKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(key.key, "API Key")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteKeyMutation.mutate(key.id)}
                          disabled={deleteKeyMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {key.last_used && (
                        <p className="text-xs text-muted-foreground">
                          Último uso: {new Date(key.last_used).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma API key encontrada.</p>
              )}
            </CardContent>
          </Card>

          {/* Configuração do Webhook */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração WhatsApp Bot</CardTitle>
              <CardDescription>
                Configure seu bot WhatsApp para usar a API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Exemplo de Configuração (Node.js)</Label>
                <Textarea
                  readOnly
                  rows={10}
                  value={`const API_BASE_URL = '${baseUrl}';
const BOT_TOKEN = 'sua_api_key_aqui';

// Autenticar usuário pelo WhatsApp
async function authenticateUser(whatsapp) {
  const response = await fetch(\`\${API_BASE_URL}/whatsapp-auth\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsapp, bot_token: BOT_TOKEN })
  });
  return response.json();
}

// Buscar saldo do usuário
async function getUserBalance(userId) {
  const response = await fetch(\`\${API_BASE_URL}/user-financial-api/user/\${userId}/balance\`, {
    headers: { 'Authorization': \`Bearer \${BOT_TOKEN}\` }
  });
  return response.json();
}

// Registrar transação rápida
async function createTransaction(userId, title, amount, type) {
  const response = await fetch(\`\${API_BASE_URL}/quick-transaction\`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${BOT_TOKEN}\`
    },
    body: JSON.stringify({ user_id: userId, title, amount, type })
  });
  return response.json();
}`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAPI;