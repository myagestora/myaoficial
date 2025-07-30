import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Terminal,
  Menu,
  ChevronRight,
  Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl, getApiInfo, generateApiCurl } from '@/utils/apiConfig';

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
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);

  // Buscar configurações do sistema para API personalizada
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*');
      
      if (error) throw error;
      
      const configObj: Record<string, string> = {};
      data.forEach(item => {
        configObj[item.key] = typeof item.value === 'string' ? 
          item.value.replace(/^"|"$/g, '') : 
          JSON.stringify(item.value).replace(/^"|"$/g, '');
      });
      
      return configObj;
    }
  });

  // Obter informações da API baseado na configuração
  const apiInfo = getApiInfo(systemConfig);

  // Buscar API keys existentes
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as APIKey[];
    }
  });

  // Gerar nova API key
  const generateKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      // Gerar nova API key usando a função do banco
      const { data: keyData, error: keyError } = await supabase
        .rpc('generate_api_key');
      
      if (keyError) throw keyError;
      
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          name,
          key: keyData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);
      
      if (error) throw error;
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
    return generateApiCurl(endpoint, systemConfig);
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
          params: { 
            whatsapp: "string"
          },
          paramDetails: {
            whatsapp: {
              type: "string",
              description: "Número do WhatsApp no formato internacional",
              example: "5511999999999",
              required: true
            }
          },
          response: { user_id: "string", session_token: "string", expires_at: "string" },
          exampleRequest: {
            whatsapp: "5511999999999"
          },
          exampleResponse: {
            user_id: "123e4567-e89b-12d3-a456-426614174000",
            session_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            expires_at: "2024-01-15T10:30:00Z"
          }
        }
      ]
    },
    {
      category: "Dados Financeiros - POST",
      icon: Database,
      color: "bg-green-500",
      endpoints: [
        {
          method: "POST",
          path: "/user-financial-api/user/{userId}/balance",
          description: "Saldo atual do usuário",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { 
            period: "string?" 
          },
          paramDetails: {
            period: {
              type: "string",
              description: "Período para cálculo do saldo ou data específica (yyyy-MM-dd)",
              example: "month",
              required: false,
              default: "month",
              options: ["week", "month", "year", "all", "yyyy-MM-dd"]
            }
          },
          response: { balance: "number", total_income: "number", total_expenses: "number", period: "string" },
          exampleRequest: {
            period: "month"
          },
          exampleResponse: {
            balance: 1250.75,
            total_income: 3500.00,
            total_expenses: 2249.25,
            period: "month",
            currency: "BRL"
          }
        },
        {
          method: "POST",
          path: "/user-financial-api/user/{userId}/transactions",
          description: "Histórico de transações e criação de nova transação",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { 
            limit: "number?", 
            period: "string?",
            title: "string?", // NOVO para criação
            amount: "number?", // NOVO para criação
            type: "string?", // NOVO para criação
            category_id: "string?", // NOVO para criação
            date: "string?", // NOVO para criação
            description: "string?", // NOVO para criação
            account_id: "string?", // NOVO
            card_id: "string?" // NOVO
          },
          paramDetails: {
            limit: {
              type: "number",
              description: "Número máximo de transações retornadas",
              example: 10,
              required: false,
              default: 50
            },
            period: {
              type: "string",
              description: "Período das transações ou data específica (yyyy-MM-dd)",
              example: "month",
              required: false,
              options: ["week", "month", "quarter", "year", "all", "yyyy-MM-dd"]
            },
            title: {
              type: "string",
              description: "Título da transação (obrigatório para criação)",
              example: "Compra no mercado",
              required: false
            },
            amount: {
              type: "number",
              description: "Valor da transação (obrigatório para criação)",
              example: -150.50,
              required: false
            },
            type: {
              type: "string",
              description: "Tipo da transação (obrigatório para criação)",
              example: "expense",
              required: false,
              options: ["income", "expense"]
            },
            category_id: {
              type: "string",
              description: "ID da categoria (obrigatório para criação)",
              example: "cat-001",
              required: false
            },
            date: {
              type: "string",
              description: "Data da transação (opcional, padrão: hoje)",
              example: "2024-01-20",
              required: false
            },
            description: {
              type: "string",
              description: "Descrição personalizada da transação (opcional)",
              example: "Compra no supermercado Pão de Açúcar",
              required: false
            },
            account_id: {
              type: "string",
              description: "ID da conta bancária vinculada (opcional)",
              example: "acc-001",
              required: false
            },
            card_id: {
              type: "string",
              description: "ID do cartão de crédito vinculado (opcional)",
              example: "card-001",
              required: false
            }
          },
          response: { transactions: "array", total_count: "number" },
          exampleRequest: {
            title: "Compra no mercado",
            amount: -150.50,
            type: "expense",
            category_id: "cat-001",
            date: "2024-01-20",
            account_id: "acc-001",
            card_id: "card-001"
          },
          exampleResponse: {
            transaction: {
              id: "trans_001",
              title: "Compra no mercado",
              amount: -150.50,
              type: "expense",
              category_id: "cat-001",
              date: "2024-01-20",
              account_id: "acc-001",
              card_id: "card-001"
            }
          }
        },
        {
          method: "POST",
          path: "/user-financial-api/user/{userId}/expenses-by-category",
          description: "Resumo de despesas por categoria",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { period: "string?" },
          paramDetails: {
            period: {
              type: "string",
              description: "Período para análise das despesas ou data específica (yyyy-MM-dd)",
              example: "month",
              required: false,
              options: ["week", "month", "quarter", "year", "yyyy-MM-dd"]
            }
          },
          response: { total_expenses: "number", by_category: "array" },
          exampleRequest: {
            period: "month"
          },
          exampleResponse: {
            total_expenses: 2249.25,
            by_category: [
              { category: "Alimentação", amount: 750.00, percentage: 33.3 },
              { category: "Transporte", amount: 450.00, percentage: 20.0 }
            ]
          }
        },
        {
          method: "POST",
          path: "/user-financial-api/user/{userId}/income-by-category",
          description: "Resumo de receitas por categoria",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { period: "string?" },
          paramDetails: {
            period: {
              type: "string",
              description: "Período para análise das receitas ou data específica (yyyy-MM-dd)",
              example: "month",
              required: false,
              options: ["week", "month", "quarter", "year", "yyyy-MM-dd"]
            }
          },
          response: { total_income: "number", by_category: "array", period: "string" },
          exampleRequest: {
            period: "month"
          },
          exampleResponse: {
            total_income: 3500.00,
            by_category: [
              { category: "Salário", total: 3000.00, count: 1, color: "#green" },
              { category: "Freelance", total: 500.00, count: 2, color: "#blue" }
            ],
            period: "month",
            currency: "BRL"
          }
        }
      ]
    },
    {
      category: "Dados Financeiros - GET",
      icon: Database,
      color: "bg-blue-500",
      endpoints: [
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/expenses",
          description: "Resumo geral de despesas",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { period: "string?" },
          paramDetails: {
            period: {
              type: "string",
              description: "Período para análise das despesas ou data específica (yyyy-MM-dd)",
              example: "month",
              required: false,
              options: ["week", "month", "quarter", "year", "yyyy-MM-dd"]
            }
          },
          response: { total_expenses: "number", transactions: "array", period: "string" },
          exampleResponse: {
            total_expenses: 2249.25,
            transactions: [
              {
                title: "Compra no mercado",
                amount: 150.50,
                date: "2024-01-15",
                category: "Transporte"
              },
              {
                title: "Conta de luz",
                amount: 89.75,
                date: "2024-01-10",
                category: "Alimentação"
              }
            ],
            period: "month",
            currency: "BRL"
          }
        },
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/income",
          description: "Resumo de receitas",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { period: "string?" },
          paramDetails: {
            period: {
              type: "string",
              description: "Período para análise das receitas ou data específica (yyyy-MM-dd)",
              example: "month",
              required: false,
              options: ["week", "month", "all", "yyyy-MM-dd"]
            }
          },
          response: { total_income: "number", transactions: "array", period: "string" },
          exampleResponse: {
            total_income: 3500.00,
            transactions: [
              {
                title: "Salário",
                amount: 3500.00,
                date: "2024-01-01"
              }
            ],
            period: "month",
            currency: "BRL"
          }
        },
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/goals",
          description: "Status das metas financeiras",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { 
            period: "string?",
            goal_type: "string?"
          },
          paramDetails: {
            period: {
              type: "string",
              description: "Período para filtrar metas, data específica (yyyy-MM-dd) ou mês específico (yyyy-MM)",
              example: "month",
              required: false,
              options: ["month", "year", "all", "yyyy-MM-dd", "yyyy-MM"]
            },
            goal_type: {
              type: "string", 
              description: "Tipo de meta",
              example: "savings",
              required: false,
              options: ["savings", "monthly_budget"]
            }
          },
          response: { 
            goals: "array", 
            total_goals: "number",
            period: "string",
            currency: "string"
          },
          exampleRequest: {
            period: "2025-07",
            goal_type: "monthly_budget"
          },
          exampleResponse: {
            goals: [
              {
                id: "goal_001",
                title: "Meta de Gastos - Alimentação",
                target_amount: 800.00,
                current_amount: 450.50,
                percentage: 56.3,
                status: "on_track",
                goal_type: "monthly_budget",
                category_name: "Alimentação",
                month_year: "2025-07"
              },
              {
                id: "goal_002",
                title: "Economizar para viagem",
                target_amount: 5000.00,
                current_amount: 1250.75,
                percentage: 25.0,
                status: "in_progress",
                goal_type: "savings",
                target_date: "2025-12-31"
              }
            ],
            total_goals: 2,
            period: "2025-07",
            currency: "BRL"
          }
        },
        {
          method: "GET",
          path: "/user-financial-api/user/{userId}/summary",
          description: "Resumo financeiro completo com dados detalhados opcionais",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { 
            period: "string?",
            detailed: "boolean?"
          },
          paramDetails: {
            period: {
              type: "string",
              description: "Período para cálculo do resumo ou data específica (yyyy-MM-dd)",
              options: ["month", "week", "year", "all", "yyyy-MM-dd"],
              example: "month",
              required: false
            },
            detailed: {
              type: "boolean",
              description: "Incluir dados detalhados de transações e metas",
              example: "true",
              required: false,
              default: "false"
            }
          },
          response: { 
            balance: "number", 
            total_income: "number",
            total_expenses: "number",
            period_income: "number",
            period_expenses: "number", 
            period_balance: "number",
            period: "string",
            active_goals: "number",
            currency: "string",
            last_updated: "string",
            details: "object?"
          },
          exampleResponse: {
            balance: 1250.75,
            total_income: 3500.00,
            total_expenses: 2249.25,
            period_income: 800.00,
            period_expenses: 474.50,
            period_balance: 325.50,
            period: "month",
            active_goals: 2,
            currency: "BRL",
            last_updated: "2024-01-15T10:30:00Z",
            details: {
              income: {
                transactions: [
                  {
                    id: "trans_001",
                    title: "Salário",
                    amount: 3500.00,
                    type: "income",
                    date: "2024-01-01",
                    category: {
                      name: "Salário",
                      color: "#22c55e",
                      icon: "dollar-sign"
                    }
                  }
                ],
                count: 1
              },
              expenses: {
                transactions: [
                  {
                    id: "trans_002",
                    title: "Compra no mercado",
                    amount: 150.50,
                    type: "expense",
                    date: "2024-01-15",
                    category: {
                      name: "Alimentação",
                      color: "#f97316",
                      icon: "utensils"
                    }
                  }
                ],
                count: 15
              },
              goals: {
                list: [
                  {
                    id: "goal_001",
                    title: "Meta Alimentação Janeiro",
                    target_amount: 800.00,
                    current_amount: 450.50,
                    progress_percentage: 56.3,
                    is_exceeded: false,
                    remaining_amount: 349.50,
                    goal_type: "monthly_budget",
                    month_year: "2024-01",
                    category: {
                      name: "Alimentação",
                      color: "#f97316",
                      icon: "utensils"
                    }
                  }
                ],
                count: 2
              }
            }
          }
        }
      ]
    },
    {
      category: "Lembretes e Notificações",
      icon: Activity,
      color: "bg-orange-500",
      endpoints: [
        {
          method: "POST",
          path: "/check-expense-reminders",
          description: "Verifica lembretes de despesas pendentes para um usuário específico",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { 
            user_id: "string"
          },
          paramDetails: {
            user_id: {
              type: "string",
              description: "ID único do usuário no formato UUID",
              example: "123e4567-e89b-12d3-a456-426614174000",
              required: true
            }
          },
          response: { 
            user_found: "boolean", 
            has_reminders: "boolean", 
            reminders_count: "number", 
            transactions: "array" 
          },
          exampleRequest: {
            user_id: "123e4567-e89b-12d3-a456-426614174000"
          },
          exampleResponse: {
            user_found: true,
            has_reminders: true,
            reminders_count: 3,
            transactions: [
              {
                id: "trans_001",
                title: "Conta de luz",
                amount: 150.75,
                created_at: "2024-01-10T08:00:00Z",
                categories: {
                  name: "Contas",
                  color: "#ef4444"
                }
              },
              {
                id: "trans_002", 
                title: "Pagamento cartão",
                amount: 850.50,
                created_at: "2024-01-05T14:30:00Z",
                categories: {
                  name: "Cartão de Crédito",
                  color: "#3b82f6"
                }
              }
            ]
          }
        },
        {
          method: "POST",
          path: "/expense-reminders",
          description: "Envia lembretes de despesas para todos os usuários com transações vencendo hoje (apenas transações agendadas previamente)",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: {},
          paramDetails: {},
          response: { 
            success: "boolean", 
            processed_count: "number", 
            sent_count: "number",
            skipped_count: "number", 
            message: "string"
          },
          exampleRequest: {},
          exampleResponse: {
            success: true,
            processed_count: 25,
            sent_count: 18,
            skipped_count: 7,
            message: "Lembretes processados com sucesso. 18 usuários notificados de 25 transações encontradas."
          }
        },
        {
          method: "POST", 
          path: "/whatsapp-expense-reminders",
          description: "Busca despesas do dia agrupadas por usuário para automação WhatsApp via n8n",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { 
            date: "string?"
          },
          paramDetails: {
            date: {
              type: "string",
              description: "Data das despesas no formato YYYY-MM-DD",
              example: "2025-01-15",
              required: false,
              default: "hoje"
            }
          },
          response: { 
            date: "string",
            users_with_expenses: "array",
            total_users: "number",
            total_amount: "number",
            generated_at: "string"
          },
          exampleRequest: {
            date: "2025-01-15"
          },
          exampleResponse: {
            date: "2025-01-15",
            users_with_expenses: [
              {
                user_id: "123e4567-e89b-12d3-a456-426614174000",
                user_name: "João Silva",
                email: "joao@email.com",
                whatsapp: "+5511999999999",
                expenses_today: [
                  {
                    id: "trans_001",
                    title: "Conta de luz",
                    description: "Energia elétrica janeiro",
                    amount: 150.00,
                    category: "Utilidades",
                    category_color: "#e74c3c",
                    category_icon: "zap"
                  }
                ],
                total_expenses: 150.00,
                expenses_count: 1
              }
            ],
            total_users: 1,
            total_amount: 150.00,
            generated_at: "2025-01-15T10:30:00Z"
          }
        }
      ]
    },
    {
      category: "Analytics",
      icon: TrendingUp,
      color: "bg-purple-500",
      endpoints: [
        {
          method: "POST",
          path: "/user-analytics-api/user/{userId}/spending-trends",
          description: "Tendências de gastos mensais",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { months: "number?" },
          paramDetails: {
            months: {
              type: "number",
              description: "Número de meses para análise",
              example: 6,
              required: false,
              default: 3,
              min: 1,
              max: 24
            }
          },
          response: { trends: "array", period_months: "number" },
          exampleRequest: {
            months: 6
          },
          exampleResponse: {
            trends: [
              { month: "2024-01", total_expenses: 2249.25, trend: "up" },
              { month: "2023-12", total_expenses: 1980.50, trend: "down" }
            ],
            period_months: 6
          }
        },
        {
          method: "POST",
          path: "/user-analytics-api/user/{userId}/category-breakdown",
          description: "Gastos por categoria",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { period: "string?" },
          paramDetails: {
            period: {
              type: "string",
              description: "Período para análise por categoria ou data específica (yyyy-MM-dd)",
              example: "month",
              required: false,
              options: ["week", "month", "quarter", "year", "all", "yyyy-MM-dd"]
            }
          },
          response: { income: "object", expenses: "object" },
          exampleRequest: {
            period: "month"
          },
          exampleResponse: {
            income: {
              total: 3500.00,
              categories: [
                { name: "Salário", amount: 3500.00 }
              ]
            },
            expenses: {
              total: 2249.25,
              categories: [
                { name: "Alimentação", amount: 750.00 },
                { name: "Transporte", amount: 450.00 }
              ]
            }
          }
        },
        {
          method: "POST",
          path: "/user-analytics-api/user/{userId}/monthly-comparison",
          description: "Comparação entre meses",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          response: { current_month: "object", previous_month: "object", comparison: "object" },
          exampleResponse: {
            current_month: {
              income: 3500.00,
              expenses: 2249.25,
              balance: 1250.75
            },
            previous_month: {
              income: 3200.00,
              expenses: 1980.50,
              balance: 1219.50
            },
            comparison: {
              income_change: 9.4,
              expense_change: 13.6,
              balance_change: 2.5
            }
          }
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
            category_id: "string",
            description: "string?",
            date: "string?",
            account_id: "string?", // NOVO
            card_id: "string?" // NOVO
          },
          paramDetails: {
            user_id: {
              type: "string",
              description: "ID único do usuário",
              example: "123e4567-e89b-12d3-a456-426614174000",
              required: true
            },
            title: {
              type: "string",
              description: "Título da transação",
              example: "Compra no mercado",
              required: true
            },
            amount: {
              type: "number",
              description: "Valor da transação (positivo para receita, negativo para despesa)",
              example: -150.50,
              required: true
            },
            type: {
              type: "string",
              description: "Tipo da transação",
              example: "expense",
              required: true,
              options: ["income", "expense"]
            },
            category_id: {
              type: "string",
              description: "ID da categoria (obrigatório)",
              example: "cat-001",
              required: true
            },
            description: {
              type: "string",
              description: "Descrição personalizada da transação (opcional)",
              example: "Compra no supermercado Pão de Açúcar",
              required: false
            },
            date: {
              type: "string",
              description: "Data da transação no formato yyyy-MM-dd (opcional, padrão: hoje)",
              example: "2024-01-20",
              required: false,
              default: "Data atual (UTC-3)"
            },
            account_id: {
              type: "string",
              description: "ID da conta bancária vinculada (opcional)",
              example: "acc-001",
              required: false
            },
            card_id: {
              type: "string",
              description: "ID do cartão de crédito vinculado (opcional)",
              example: "card-001",
              required: false
            }
          },
          response: { success: "boolean", transaction: "object", updated_balance: "object" },
          exampleRequest: {
            user_id: "123e4567-e89b-12d3-a456-426614174000",
            title: "Boleto Faculdade",
            amount: -1200.00,
            type: "expense",
            category_id: "cat-001",
            description: "Mensalidade da faculdade",
            date: "2024-01-20",
            account_id: "acc-001",
            card_id: "card-001"
          },
          exampleResponse: {
            success: true,
            transaction: {
              id: "trans_001",
              title: "Boleto Faculdade",
              amount: -1200.00,
              type: "expense",
              category: "Educação",
              date: "2024-01-20",
              account_id: "acc-001",
              card_id: "card-001"
            },
            updated_balance: {
              balance: 1100.25,
              total_income: 3500.00,
              total_expenses: 2399.75
            }
          }
        }
      ]
    },
    {
      category: "Categorias",
      icon: Tag,
      color: "bg-purple-500",
      endpoints: [
        {
          method: "POST",
          path: "/list-categories",
          description: "Lista categorias disponíveis para o usuário (padrões + personalizadas)",
          headers: { Authorization: "Bearer your-api-key" },
          params: {
            user_id: "string"
          },
          paramDetails: {
            user_id: {
              type: "string", 
              description: "ID do usuário",
              example: "12345678-1234-1234-1234-123456789012",
              required: true
            }
          },
          response: { success: "boolean", categories: "array", total: "number" },
          curl: `curl -X POST "${apiInfo.baseUrl}/list-categories" \\\n  -H "Authorization: Bearer your-api-key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"user_id": "12345678-1234-1234-1234-123456789012"}'`,
          exampleRequest: {
            user_id: "12345678-1234-1234-1234-123456789012"
          },
          exampleResponse: {
            success: true,
            categories: [
              {
                id: "cat-001",
                name: "Alimentação",
                color: "#10B981",
                icon: "utensils",
                type: "expense",
                is_default: true,
                user_id: null,
                created_at: "2024-01-01T00:00:00Z"
              },
              {
                id: "cat-002", 
                name: "Categoria Personalizada",
                color: "#3B82F6",
                icon: "tag",
                type: "expense",
                is_default: false,
                user_id: "12345678-1234-1234-1234-123456789012",
                created_at: "2024-01-15T10:00:00Z"
              }
            ],
            total: 2
          }
        }
      ]
    },
    {
      category: "Contas e Cartões",
      icon: Tag,
      color: "bg-blue-500",
      endpoints: [
        {
          method: "POST",
          path: "/list-accounts",
          description: "Lista contas bancárias e cartões de crédito do usuário",
          headers: { Authorization: "Bearer your-api-key" },
          params: {
            user_id: "string"
          },
          paramDetails: {
            user_id: {
              type: "string",
              description: "ID do usuário",
              example: "12345678-1234-1234-1234-123456789012",
              required: true
            }
          },
          response: { success: "boolean", accounts: "array", cards: "array", total_accounts: "number", total_cards: "number" },
          exampleRequest: {
            user_id: "12345678-1234-1234-1234-123456789012"
          },
          exampleResponse: {
            success: true,
            accounts: [
              {
                id: "acc-001",
                name: "Banco Inter",
                type: "checking",
                bank_name: "Banco Inter",
                account_number: "12345-6",
                balance: 1000.00,
                is_default: true,
                color: "#FBBF24"
              }
            ],
            cards: [
              {
                id: "card-001",
                name: "Nubank",
                last_four_digits: "1234",
                is_default: true,
                color: "#A78BFA"
              }
            ],
            total_accounts: 1,
            total_cards: 1
          }
        }
      ]
    },
    {
      category: "Alertas",
      icon: Activity,
      color: "bg-red-500",
      endpoints: [
        {
          method: "POST",
          path: "/user-alerts",
          description: "Alertas sobre metas e gastos",
          headers: { Authorization: "Bearer your-secure-bot-token" },
          params: { user_id: "string" },
          paramDetails: {
            user_id: {
              type: "string",
              description: "ID único do usuário",
              example: "123e4567-e89b-12d3-a456-426614174000",
              required: true
            }
          },
          response: { alerts: "array", total_alerts: "number" },
          exampleRequest: {
            user_id: "123e4567-e89b-12d3-a456-426614174000"
          },
          exampleResponse: {
            alerts: [
              {
                id: "alert_001",
                type: "goal_warning",
                title: "Meta em risco",
                message: "Você já gastou 80% do limite para alimentação este mês",
                severity: "warning",
                created_at: "2024-01-15T10:30:00Z"
              },
              {
                id: "alert_002",
                type: "spending_spike",
                title: "Gasto elevado",
                message: "Seus gastos este mês estão 25% acima da média",
                severity: "info",
                created_at: "2024-01-15T09:15:00Z"
              }
            ],
            total_alerts: 2
          }
        }
      ]
    },
    {
      category: "Monitoramento de Assinaturas",
      icon: Activity,
      color: "bg-indigo-500",
      endpoints: [
        {
          method: "POST",
          path: "/subscription-expiring-api",
          description: "Lista assinaturas ativas que estão próximas do vencimento (hoje, 2, 5 e 10 dias)",
          headers: { Authorization: "Bearer your-api-key" },
          params: {},
          paramDetails: {},
          response: { 
            expiring_today: "array",
            expiring_in_2_days: "array",
            expiring_in_5_days: "array", 
            expiring_in_10_days: "array",
            total_expiring: "number"
          },
          exampleRequest: {},
          exampleResponse: {
            expiring_today: [
              {
                subscription_id: "sub_123e4567",
                user_name: "João Silva",
                phone: "+5511999999999",
                plan_name: "MYA Gestora",
                expiration_date: "2025-07-17",
                days_until_expiration: 0
              }
            ],
            expiring_in_2_days: [
              {
                subscription_id: "sub_456e7890",
                user_name: "Maria Santos",
                phone: "+5511888888888",
                plan_name: "MYA Gestora Premium",
                expiration_date: "2025-07-19",
                days_until_expiration: 2
              }
            ],
            expiring_in_5_days: [],
            expiring_in_10_days: [],
            total_expiring: 2
          }
        },
        {
          method: "POST",
          path: "/subscription-expired-yesterday-api",
          description: "Lista assinaturas ativas que venceram ontem (para atualizar status para past_due)",
          headers: { Authorization: "Bearer your-api-key" },
          params: {},
          paramDetails: {},
          response: { 
            expired_yesterday: "array",
            total_count: "number"
          },
          exampleRequest: {},
          exampleResponse: {
            expired_yesterday: [
              {
                subscription_id: "sub_789e0123",
                user_name: "Pedro Costa",
                phone: "+5511777777777",
                plan_name: "MYA Gestora",
                expiration_date: "2025-07-16"
              }
            ],
            total_count: 1
          }
        },
        {
          method: "POST",
          path: "/subscription-past-due",
          description: "Lista assinaturas vencidas (status past_due) nos últimos 30 dias para cobrança",
          headers: { Authorization: "Bearer your-api-key" },
          params: {},
          paramDetails: {},
          response: { 
            past_due_subscriptions: "array",
            total_count: "number",
            period_filter: "string",
            generated_at: "string"
          },
          exampleRequest: {},
          exampleResponse: {
            past_due_subscriptions: [
              {
                subscription_id: "sub_abc123",
                user_name: "Carlos Silva",
                phone: "+5511666666666",
                plan_name: "MYA Gestora",
                frequency: "Mensal",
                expiration_date: "2025-07-10",
                days_overdue: 7,
                status: "past_due"
              },
              {
                subscription_id: "sub_def456",
                user_name: "Ana Costa",
                phone: "+5511555555555",
                plan_name: "MYA Gestora Premium",
                frequency: "Anual",
                expiration_date: "2025-07-05",
                days_overdue: 12,
                status: "past_due"
              }
            ],
            total_count: 2
          }
        }
      ]
    },
    {
      category: "Gestão de Contas",
      icon: Shield,
      color: "bg-red-500",
      endpoints: [
        {
          method: "POST",
          path: "/suspend-account",
          description: "Suspende conta de um cliente baseado no subscription_id",
          headers: { Authorization: "Bearer your-api-key" },
          params: { 
            subscription_id: "string"
          },
          paramDetails: {
            subscription_id: {
              type: "string",
              description: "ID da assinatura a ser suspensa",
              example: "123e4567-e89b-12d3-a456-426614174000",
              required: true
            }
          },
          response: { 
            success: "boolean",
            message: "string",
            data: "object"
          },
          exampleRequest: {
            subscription_id: "123e4567-e89b-12d3-a456-426614174000"
          },
          exampleResponse: {
            success: true,
            message: "Account suspended successfully",
            data: {
              subscription_id: "123e4567-e89b-12d3-a456-426614174000",
              user_id: "456e7890-e12b-34d5-a678-901234567890",
              user_name: "João Silva",
              user_email: "joao@email.com",
              previous_subscription_status: "active",
              new_subscription_status: "canceled",
              previous_account_status: "active",
              new_account_status: "suspended",
              suspended_at: "2025-07-17T15:30:00Z"
            }
          }
        },
        {
          method: "POST",
          path: "/activate-account",
          description: "Ativa conta de um cliente suspenso baseado no subscription_id",
          headers: { Authorization: "Bearer your-api-key" },
          params: { 
            subscription_id: "string"
          },
          paramDetails: {
            subscription_id: {
              type: "string",
              description: "ID da assinatura a ser ativada",
              example: "123e4567-e89b-12d3-a456-426614174000",
              required: true
            }
          },
          response: { 
            success: "boolean",
            message: "string",
            data: "object"
          },
          exampleRequest: {
            subscription_id: "123e4567-e89b-12d3-a456-426614174000"
          },
          exampleResponse: {
            success: true,
            message: "Account activated successfully",
            data: {
              subscription_id: "123e4567-e89b-12d3-a456-426614174000",
              user_id: "456e7890-e12b-34d5-a678-901234567890",
              user_name: "João Silva",
              user_email: "joao@email.com",
              previous_subscription_status: "canceled",
              new_subscription_status: "active",
              previous_account_status: "suspended",
              new_account_status: "active",
              activated_at: "2025-07-17T15:30:00Z",
              new_period_end: "2025-08-17T15:30:00Z"
            }
          }
        }
      ]
    },
    {
      category: "Recuperação de Carrinho",
      icon: TrendingUp,
      color: "bg-purple-500",
      endpoints: [
        {
          method: "GET",
          path: "/api/cart-recovery/abandoned",
          description: "Listar carrinhos abandonados com filtros e paginação",
          headers: { Authorization: "Bearer your-service-role-key" },
          params: { 
            status: "string?",
            start_date: "string?",
            end_date: "string?",
            email: "string?",
            whatsapp: "string?",
            minutes: "number?",
            limit: "number?",
            offset: "number?"
          },
          paramDetails: {
            status: {
              type: "string",
              description: "Filtrar por status (abandoned, active, converted, completed)",
              example: "abandoned",
              required: false,
              options: ["abandoned", "active", "converted", "completed"]
            },
            start_date: {
              type: "string",
              description: "Data inicial para filtro (YYYY-MM-DD)",
              example: "2025-07-01",
              required: false
            },
            end_date: {
              type: "string",
              description: "Data final para filtro (YYYY-MM-DD)",
              example: "2025-07-31",
              required: false
            },
            email: {
              type: "string",
              description: "Filtrar por email (busca parcial)",
              example: "joao@email.com",
              required: false
            },
            whatsapp: {
              type: "string",
              description: "Filtrar por WhatsApp (busca parcial)",
              example: "+5531984798496",
              required: false
            },
            minutes: {
              type: "number",
              description: "Filtrar sessões dos últimos X minutos",
              example: 5,
              required: false
            },
            limit: {
              type: "number",
              description: "Limite de resultados por página",
              example: 50,
              required: false,
              default: 50
            },
            offset: {
              type: "number",
              description: "Offset para paginação",
              example: 0,
              required: false,
              default: 0
            }
          },
          response: { 
            success: "boolean", 
            data: "array", 
            count: "number",
            total_count: "number",
            pagination: "object",
            filters: "object"
          },
                      exampleResponse: {
              success: true,
              data: [
                {
                  id: "uuid",
                  session_id: "session_123...",
                  user_name: "João Silva",
                  user_email: "joao@email.com",
                  user_whatsapp: "+5531984798496",
                  amount: 29.90,
                  frequency: "monthly",
                  created_at: "2025-07-29T23:51:28.000Z",
                  abandoned_at: "2025-07-29T23:56:28.000Z",
                  status: "abandoned",
                  subscription_plans: {
                    id: "uuid",
                    name: "Plano Básico",
                    description: "Plano básico mensal"
                  },
                  attempts: [
                    {
                      attempt_number: 1,
                      method: "whatsapp",
                      status: "sent",
                      sent_at: "2025-07-29T23:56:28.000Z",
                      error_message: null
                    }
                  ]
                }
              ],
              count: 1,
              total_count: 150,
              pagination: {
                limit: 50,
                offset: 0,
                has_more: true
              },
              filters: {
                status: "abandoned",
                start_date: "2025-07-01",
                end_date: "2025-07-31",
                email: null,
                whatsapp: null,
                minutes: null
              }
            }
        },
        {
          method: "GET",
          path: "/api/cart-recovery/config",
          description: "Obter configurações de recuperação",
          headers: { Authorization: "Bearer your-service-role-key" },
          response: { 
            success: "boolean", 
            data: "object" 
          },
          exampleResponse: {
            success: true,
            data: {
              config: {
                enabled: true,
                whatsapp_enabled: true,
                email_enabled: false,
                delay_minutes: 5,
                max_attempts: 3
              },
              templates: [
                {
                  id: "uuid",
                  name: "Tentativa 1",
                  type: "whatsapp",
                  content: "Olá {{user_name}}! 👋\n\nNotamos que você estava interessado no plano {{plan_name}} por {{amount}}/{{frequency}}, mas não finalizou sua assinatura.\n\nQue tal aproveitar um desconto especial de 10%?\n\n💰 Valor original: {{original_amount}}\n🎉 Com desconto: {{discount_amount}}\n\nClique aqui para finalizar: {{checkout_url}}\n\nAtenciosamente,\nEquipe MYA",
                  is_active: true
                }
              ],
              whatsapp: {
                evolution_api_url: "https://api.evolution.com",
                evolution_api_key: "your-api-key",
                evolution_instance_name: "mya-instance"
              }
            }
          }
        },
        {
          method: "PUT",
          path: "/api/cart-recovery/session",
          description: "Atualizar status da sessão",
          headers: { 
            Authorization: "Bearer your-service-role-key",
            "Content-Type": "application/json"
          },
          params: { 
            sessionId: "string",
            status: "string",
            metadata: "object?"
          },
          paramDetails: {
            sessionId: {
              type: "string",
              description: "ID da sessão do carrinho",
              example: "session_123...",
              required: true
            },
            status: {
              type: "string",
              description: "Novo status da sessão",
              example: "completed",
              required: true,
              options: ["completed", "converted", "abandoned"]
            },
            metadata: {
              type: "object",
              description: "Metadados adicionais (opcional)",
              example: { conversion_source: "whatsapp", payment_method: "pix" },
              required: false
            }
          },
          exampleRequest: {
            sessionId: "session_123...",
            status: "converted",
            metadata: {
              conversion_source: "whatsapp",
              attempt_number: 1
            }
          },
          response: { 
            success: "boolean", 
            message: "string" 
          },
          exampleResponse: {
            success: true,
            message: "Session status updated successfully"
          }
        },
        {
          method: "POST",
          path: "/api/cart-recovery/attempt",
          description: "Registrar tentativa de envio",
          headers: { 
            Authorization: "Bearer your-service-role-key",
            "Content-Type": "application/json"
          },
          params: { 
            sessionId: "string",
            attemptNumber: "number",
            method: "string",
            status: "string",
            messageContent: "string?",
            messageId: "string?",
            errorMessage: "string?"
          },
          paramDetails: {
            sessionId: {
              type: "string",
              description: "ID da sessão do carrinho",
              example: "session_123...",
              required: true
            },
            attemptNumber: {
              type: "number",
              description: "Número da tentativa",
              example: 1,
              required: true
            },
            method: {
              type: "string",
              description: "Método de envio",
              example: "whatsapp",
              required: true,
              options: ["whatsapp", "email"]
            },
            status: {
              type: "string",
              description: "Status da tentativa",
              example: "sent",
              required: true,
              options: ["sent", "failed"]
            },
            messageContent: {
              type: "string",
              description: "Conteúdo da mensagem enviada",
              example: "Mensagem enviada...",
              required: false
            },
            messageId: {
              type: "string",
              description: "ID da mensagem (WhatsApp)",
              example: "whatsapp-message-id",
              required: false
            },
            errorMessage: {
              type: "string",
              description: "Mensagem de erro se status = failed",
              example: "Erro de conexão",
              required: false
            }
          },
          exampleRequest: {
            sessionId: "session_123...",
            attemptNumber: 1,
            method: "whatsapp",
            status: "sent",
            messageContent: "Mensagem enviada...",
            messageId: "whatsapp-message-id"
          },
          response: { 
            success: "boolean", 
            message: "string" 
          },
          exampleResponse: {
            success: true,
            message: "Attempt recorded successfully"
          }
        },
        {
          method: "POST",
          path: "/mark-cart-converted",
          description: "Marcar carrinhos como convertidos quando usuário ativa plano",
          headers: { 
            Authorization: "Bearer your-service-role-key",
            "Content-Type": "application/json"
          },
          params: { 
            userEmail: "string?",
            userWhatsapp: "string?",
            userId: "string?"
          },
          paramDetails: {
            userEmail: {
              type: "string",
              description: "Email do usuário para identificar carrinhos",
              example: "joao@email.com",
              required: false
            },
            userWhatsapp: {
              type: "string",
              description: "WhatsApp do usuário para identificar carrinhos",
              example: "+5531984798496",
              required: false
            },
            userId: {
              type: "string",
              description: "ID do usuário (UUID)",
              example: "123e4567-e89b-12d3-a456-426614174000",
              required: false
            }
          },
          exampleRequest: {
            userEmail: "joao@email.com",
            userId: "123e4567-e89b-12d3-a456-426614174000"
          },
          response: { 
            success: "boolean", 
            message: "string",
            converted_count: "number",
            sessions: "array"
          },
          exampleResponse: {
            success: true,
            message: "Cart sessions marked as converted",
            converted_count: 2,
            sessions: [
              {
                session_id: "session_123...",
                user_email: "joao@email.com",
                user_whatsapp: "+5531984798496",
                previous_status: "abandoned"
              }
            ]
          }
        },
        {
          method: "POST",
          path: "/manage-cart-templates",
          description: "Sincronizar templates com configuração de tentativas",
          headers: { 
            Authorization: "Bearer your-service-role-key",
            "Content-Type": "application/json"
          },
          params: { 
            action: "string"
          },
          paramDetails: {
            action: {
              type: "string",
              description: "Ação a executar (sync)",
              example: "sync",
              required: true,
              options: ["sync"]
            }
          },
          exampleRequest: {
            action: "sync"
          },
          response: { 
            success: "boolean", 
            message: "string",
            max_attempts: "number",
            results: "object"
          },
          exampleResponse: {
            success: true,
            message: "Templates sincronizados com sucesso",
            max_attempts: 3,
            results: { created: 4, deleted: 2, errors: [] }
          }
        },
        {
          method: "GET",
          path: "/manage-cart-templates",
          description: "Listar templates de recuperação",
          headers: { 
            Authorization: "Bearer your-service-role-key"
          },
          response: { 
            success: "boolean", 
            data: "array",
            count: "number"
          },
          exampleResponse: {
            success: true,
            data: [
              {
                id: "uuid",
                name: "Tentativa 1",
                type: "whatsapp",
                attempt_number: 1,
                content: "Olá {{user_name}}! 👋...",
                is_active: true
              }
            ],
            count: 6
          }
        }
      ]
    }
  ];


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
          <div className="flex gap-6">
            {/* Menu Lateral */}
            <div className="w-80 flex-shrink-0">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Endpoints</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2 p-3">
                    {/* Botão Visão Geral */}
                    <Button
                      variant={!selectedEndpoint ? "secondary" : "ghost"}
                      className="w-full justify-start h-auto p-3"
                      onClick={() => setSelectedEndpoint(null)}
                    >
                      <Code className="h-4 w-4 flex-shrink-0" />
                      <div className="ml-2 text-left">
                        <div className="font-medium">Visão Geral</div>
                        <div className="text-xs text-muted-foreground">Documentação da API</div>
                      </div>
                    </Button>
                    
                    <Separator />
                    
                    {/* Menu por Categoria */}
                    {endpoints.map((category) => {
                      // Verificar se algum endpoint desta categoria está selecionado
                      const isCategoryActive = selectedEndpoint && category.endpoints.includes(selectedEndpoint);
                      
                      return (
                        <div key={category.category} className="space-y-1">
                          <div className={`flex items-center gap-2 px-2 py-1 text-sm font-medium transition-colors ${
                            isCategoryActive 
                              ? 'text-primary bg-primary/10 rounded' 
                              : 'text-muted-foreground'
                          }`}>
                            <div className={`p-1 rounded ${category.color} ${
                              isCategoryActive ? 'ring-2 ring-primary/30' : ''
                            }`}>
                              <category.icon className="h-3 w-3 text-white" />
                            </div>
                            <span className={isCategoryActive ? 'font-semibold' : ''}>{category.category}</span>
                          </div>
                        
                        {category.endpoints.map((endpoint, idx) => (
                          <Button
                            key={`${category.category}-${idx}`}
                            variant={selectedEndpoint === endpoint ? "default" : "ghost"}
                            className={`w-full justify-start h-auto p-2 pl-6 transition-colors ${
                              selectedEndpoint === endpoint 
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedEndpoint(endpoint)}
                          >
                            <Badge 
                              variant="outline"
                              className={`text-xs mr-2 flex-shrink-0 ${
                                selectedEndpoint === endpoint
                                  ? 'border-primary-foreground/20 text-primary-foreground'
                                  : endpoint.method === 'GET' 
                                    ? 'border-blue-500 text-blue-700' 
                                    : 'border-green-500 text-green-700'
                              }`}
                            >
                              {endpoint.method}
                            </Badge>
                            <div className="text-left flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {endpoint.path.split('/').pop()}
                              </div>
                              <div className={`text-xs truncate ${
                                selectedEndpoint === endpoint 
                                  ? 'text-primary-foreground/80' 
                                  : 'text-muted-foreground'
                              }`}>
                                {endpoint.description}
                              </div>
                            </div>
                          </Button>
                         ))}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conteúdo Principal */}
            <div className="flex-1 min-w-0">
              {!selectedEndpoint ? (
                // Visão Geral
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        {apiInfo.title}
                      </CardTitle>
                      <CardDescription>
                        {apiInfo.description}
                      </CardDescription>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>Versão: {apiInfo.version}</span>
                        {systemConfig?.api_enabled === 'true' && (
                          <span className="text-green-600 font-medium">API Ativa</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="bg-muted p-4 rounded-lg">
                         <p className="font-medium mb-2">Base URL:</p>
                         <div className="flex items-center gap-2">
                           <code className="bg-background px-2 py-1 rounded text-sm flex-1">
                             {apiInfo.baseUrl}
                           </code>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => copyToClipboard(apiInfo.baseUrl, "Base URL")}
                           >
                             <Copy className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div className="text-center p-4 border rounded-lg">
                          <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                          <p className="font-medium">Recuperação de Carrinho</p>
                          <p className="text-sm text-muted-foreground">API para gerenciar carrinhos abandonados com filtros e conversão automática</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resumo de Categorias */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {endpoints.map((category) => (
                      <Card key={category.category}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <div className={`p-2 rounded-lg ${category.color}`}>
                              <category.icon className="h-4 w-4 text-white" />
                            </div>
                            {category.category}
                          </CardTitle>
                          <CardDescription>
                            {category.endpoints.length} endpoint{category.endpoints.length > 1 ? 's' : ''} disponível{category.endpoints.length > 1 ? 'eis' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {category.endpoints.map((endpoint, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm p-2 hover:bg-muted rounded cursor-pointer" onClick={() => setSelectedEndpoint(endpoint)}>
                                <Badge 
                                  variant="outline"
                                  className={`text-xs flex-shrink-0 ${
                                    endpoint.method === 'GET' 
                                      ? 'border-blue-500 text-blue-700' 
                                      : 'border-green-500 text-green-700'
                                  }`}
                                >
                                  {endpoint.method}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {endpoint.path.split('/').pop()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {endpoint.description}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Exemplos Práticos - Recuperação de Carrinho */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                        Exemplos Práticos - Recuperação de Carrinho
                      </CardTitle>
                      <CardDescription>
                        Casos de uso comuns e exemplos de implementação
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm mb-2">1. Buscar carrinhos abandonados com filtros</h4>
                          <div className="bg-muted p-3 rounded text-xs font-mono">
                            GET /api/cart-recovery/abandoned?start_date=2025-07-01&end_date=2025-07-31&limit=10
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">2. Buscar por email específico</h4>
                          <div className="bg-muted p-3 rounded text-xs font-mono">
                            GET /api/cart-recovery/abandoned?email=joao@email.com&status=abandoned
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">3. Buscar sessões dos últimos 5 minutos</h4>
                          <div className="bg-muted p-3 rounded text-xs font-mono">
                            GET /api/cart-recovery/abandoned?minutes=5&status=abandoned
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">4. Marcar carrinho como convertido</h4>
                          <div className="bg-muted p-3 rounded text-xs font-mono">
                            POST /mark-cart-converted<br/>
                            {"{"}<br/>
                            &nbsp;&nbsp;"userEmail": "joao@email.com",<br/>
                            &nbsp;&nbsp;"userId": "123e4567-e89b-12d3-a456-426614174000"<br/>
                            {"}"}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">5. Conversão automática via webhook</h4>
                          <div className="text-xs text-muted-foreground">
                            Quando um usuário ativa um plano, o webhook automaticamente marca todos os carrinhos abandonados como convertidos.
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-sm mb-2">6. Sincronizar templates</h4>
                          <div className="bg-muted p-3 rounded text-xs font-mono">
                            POST /manage-cart-templates
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Sincroniza templates automaticamente baseado na configuração de tentativas.
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // Detalhes do Endpoint Selecionado
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant={selectedEndpoint.method === 'GET' ? 'secondary' : 'default'}
                        className={selectedEndpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                      >
                        {selectedEndpoint.method}
                      </Badge>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {selectedEndpoint.path}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`${apiInfo.baseUrl}${selectedEndpoint.path}`, "Endpoint")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle>{selectedEndpoint.description}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Headers */}
                    {selectedEndpoint.headers && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Headers</h3>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre>{JSON.stringify(selectedEndpoint.headers, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {/* Parâmetros */}
                    {selectedEndpoint.paramDetails && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Parâmetros</h3>
                        <div className="space-y-4">
                          {Object.entries(selectedEndpoint.paramDetails).map(([key, param]: [string, any]) => (
                            <div key={key} className="border rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <code className="bg-muted px-2 py-1 rounded text-sm font-medium">
                                  {key}
                                </code>
                                <Badge variant={param.required ? "default" : "secondary"}>
                                  {param.required ? "Obrigatório" : "Opcional"}
                                </Badge>
                                <Badge variant="outline">{param.type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {param.description}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Exemplo:</span>
                                  <code className="ml-2 bg-muted px-2 py-1 rounded">
                                    {JSON.stringify(param.example)}
                                  </code>
                                </div>
                                {param.options && (
                                  <div>
                                    <span className="font-medium">Opções:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {param.options.map((option: string) => (
                                        <Badge key={option} variant="outline" className="text-xs">
                                          {option}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {param.default && (
                                  <div>
                                    <span className="font-medium">Padrão:</span>
                                    <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                                      {JSON.stringify(param.default)}
                                    </code>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exemplo de Requisição */}
                    {selectedEndpoint.exampleRequest && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Exemplo de Requisição</h3>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre>{JSON.stringify(selectedEndpoint.exampleRequest, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {/* Exemplo de Resposta */}
                    {selectedEndpoint.exampleResponse && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Exemplo de Resposta</h3>
                        <div className="bg-muted p-3 rounded text-sm">
                          <pre>{JSON.stringify(selectedEndpoint.exampleResponse, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {/* cURL */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium">Comando cURL</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(generateCurlCommand(selectedEndpoint), "Comando cURL")}
                        >
                          <Terminal className="h-3 w-3 mr-1" />
                          Copiar cURL
                        </Button>
                      </div>
                      <div className="bg-muted p-3 rounded text-sm">
                        <pre className="whitespace-pre-wrap text-wrap">{generateCurlCommand(selectedEndpoint)}</pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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
                  value={`const API_BASE_URL = '${apiInfo.baseUrl}';
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
async function createTransaction(userId, title, amount, type, categoryId, date = null) {
  const body = { user_id: userId, title, amount, type, category_id: categoryId };
  if (date) body.date = date; // Opcional: formato yyyy-MM-dd
  const response = await fetch(\`\${API_BASE_URL}/quick-transaction\`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${BOT_TOKEN}\`
    },
    body: JSON.stringify(body)
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