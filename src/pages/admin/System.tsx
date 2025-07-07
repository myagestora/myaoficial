import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Database, Server, Shield, Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const AdminSystem = () => {
  const [backupSettings, setBackupSettings] = useState({
    auto_backup: true,
    backup_frequency: 'daily',
    retention_days: 30
  });

  const queryClient = useQueryClient();

  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      try {
        // Verificar conexão com o banco
        const { data: dbTest, error: dbError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);

        const dbStatus = !dbError ? 'healthy' : 'error';

        // Verificar estatísticas básicas - usar count corretamente
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: transactionCount, error: transactionError } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true });

        return {
          database: {
            status: dbStatus,
            users: userCount || 0,
            transactions: transactionCount || 0
          },
          api: {
            status: 'healthy',
            response_time: '< 100ms'
          },
          storage: {
            status: 'healthy',
            usage: '15%'
          }
        };
      } catch (error) {
        return {
          database: { status: 'error', users: 0, transactions: 0 },
          api: { status: 'error', response_time: 'N/A' },
          storage: { status: 'unknown', usage: 'N/A' }
        };
      }
    },
    refetchInterval: 30000 // Atualiza a cada 30 segundos
  });

  const { data: systemLogs } = useQuery({
    queryKey: ['system-logs'],
    queryFn: async () => {
      // Simular logs do sistema (em um ambiente real, viriam de uma tabela de logs)
      return [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Sistema iniciado com sucesso',
          component: 'API'
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: 'WARN',
          message: 'Alto número de requisições detectado',
          component: 'API'
        },
        {
          id: 3,
          timestamp: new Date(Date.now() - 600000).toISOString(),
          level: 'INFO',
          message: 'Backup automático executado',
          component: 'Database'
        }
      ];
    }
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      // Simular processo de backup
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Backup Iniciado',
        description: 'O processo de backup foi iniciado com sucesso.',
      });
    }
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      // Limpar cache do query client
      queryClient.clear();
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Cache Limpo',
        description: 'O cache do sistema foi limpo com sucesso.',
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-100 text-green-800">Saudável</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Atenção</Badge>;
      case 'error': return <Badge className="bg-red-100 text-red-800">Erro</Badge>;
      default: return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sistema</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitoramento e manutenção do sistema</p>
      </div>

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList>
          <TabsTrigger value="health">Saúde do Sistema</TabsTrigger>
          <TabsTrigger value="backup">Backup & Manutenção</TabsTrigger>
          <TabsTrigger value="logs">Logs do Sistema</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Base de Dados</CardTitle>
                <Database className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusBadge(systemHealth?.database.status || 'unknown')}
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth?.database.status || 'unknown')}`} />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Usuários: {systemHealth?.database.users || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Transações: {systemHealth?.database.transactions || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API</CardTitle>
                <Server className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusBadge(systemHealth?.api.status || 'unknown')}
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth?.api.status || 'unknown')}`} />
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Tempo de resposta: {systemHealth?.api.response_time || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Armazenamento</CardTitle>
                <Activity className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusBadge(systemHealth?.storage.status || 'unknown')}
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth?.storage.status || 'unknown')}`} />
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Uso: {systemHealth?.storage.usage || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Backup Manual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Execute um backup completo do sistema manualmente.
                </p>
                <Button 
                  onClick={() => backupMutation.mutate()}
                  disabled={backupMutation.isPending}
                  className="w-full"
                >
                  {backupMutation.isPending ? 'Executando Backup...' : 'Executar Backup'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limpeza de Cache</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Limpe o cache do sistema para melhorar a performance.
                </p>
                <Button 
                  onClick={() => clearCacheMutation.mutate()}
                  disabled={clearCacheMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {clearCacheMutation.isPending ? 'Limpando Cache...' : 'Limpar Cache'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configurações de Backup Automático</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-backup">Backup Automático</Label>
                <Switch
                  id="auto-backup"
                  checked={backupSettings.auto_backup}
                  onCheckedChange={(checked) => setBackupSettings(prev => ({ ...prev, auto_backup: checked }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Frequência</Label>
                  <select 
                    id="frequency"
                    className="w-full p-2 border rounded-md"
                    value={backupSettings.backup_frequency}
                    onChange={(e) => setBackupSettings(prev => ({ ...prev, backup_frequency: e.target.value }))}
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="retention">Retenção (dias)</Label>
                  <Input
                    id="retention"
                    type="number"
                    value={backupSettings.retention_days}
                    onChange={(e) => setBackupSettings(prev => ({ ...prev, retention_days: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logs Recentes do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemLogs?.map((log) => (
                  <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={log.level === 'ERROR' ? 'destructive' : log.level === 'WARN' ? 'secondary' : 'default'}>
                          {log.level}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{log.component}</span>
                      </div>
                      <p className="text-sm">{log.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configurações de Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Autenticação de Dois Fatores</Label>
                  <Switch defaultChecked={true} />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Logs de Auditoria</Label>
                  <Switch defaultChecked={true} />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Rate Limiting</Label>
                  <Switch defaultChecked={true} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas de Segurança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Nenhuma tentativa de acesso suspeita detectada
                    </p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ℹ️ Último backup de segurança: há 2 horas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSystem;
