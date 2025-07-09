
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotificationsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any>(null);

  // Estados do formulário
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [expiresAt, setExpiresAt] = useState('');

  // Buscar notificações
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Criar/Atualizar notificação
  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData: any) => {
      if (!user?.id) throw new Error('User not found');
      
      const data = {
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        created_by: user.id,
        expires_at: notificationData.expiresAt || null,
        is_active: true,
      };

      if (editingNotification) {
        const { error } = await supabase
          .from('notifications')
          .update(data)
          .eq('id', editingNotification.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notifications')
          .insert(data);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: editingNotification ? "✅ Notificação atualizada!" : "🎉 Notificação criada!",
        description: editingNotification 
          ? "As alterações foram salvas com sucesso!" 
          : "Sua notificação foi enviada para todos os usuários!",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "😔 Ops! Algo deu errado",
        description: "Não conseguimos salvar a notificação. Que tal tentar novamente?",
        variant: "destructive",
      });
    },
  });

  // Deletar notificação
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "🗑️ Notificação removida!",
        description: "A notificação foi excluída com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "😔 Não foi possível excluir",
        description: "Tivemos um problema ao remover a notificação. Tente novamente?",
        variant: "destructive",
      });
    },
  });

  // Toggle ativo/inativo
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setType('info');
    setExpiresAt('');
    setEditingNotification(null);
  };

  const openEditDialog = (notification: any) => {
    setEditingNotification(notification);
    setTitle(notification.title);
    setMessage(notification.message);
    setType(notification.type);
    setExpiresAt(notification.expires_at ? new Date(notification.expires_at).toISOString().slice(0, 16) : '');
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast({
        title: "📝 Campos obrigatórios",
        description: "Por favor, preencha o título e a mensagem da notificação.",
        variant: "destructive",
      });
      return;
    }

    createNotificationMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      type,
      expiresAt: expiresAt || null,
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'success':
        return '✅ Sucesso';
      case 'warning':
        return '⚠️ Aviso';
      case 'error':
        return '❌ Erro';
      default:
        return 'ℹ️ Informação';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            📢 Gerenciar Notificações
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Envie mensagens importantes para todos os usuários da plataforma
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Notificação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingNotification ? '✏️ Editar Notificação' : '✨ Nova Notificação'}
              </DialogTitle>
              <DialogDescription>
                {editingNotification 
                  ? 'Faça as alterações necessárias na sua notificação.'
                  : 'Crie uma notificação que será enviada para todos os usuários.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título da Notificação</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Nova funcionalidade disponível!"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva uma mensagem clara e amigável para seus usuários..."
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="type">Tipo da Notificação</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Informação</SelectItem>
                    <SelectItem value="success">✅ Boa notícia</SelectItem>
                    <SelectItem value="warning">⚠️ Atenção</SelectItem>
                    <SelectItem value="error">❌ Importante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="expires_at">Data de Expiração (Opcional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco para que a notificação não expire
                </p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createNotificationMutation.isPending}>
                  {createNotificationMutation.isPending
                    ? 'Salvando...'
                    : editingNotification
                    ? 'Atualizar'
                    : 'Criar e Enviar'
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                📭 Nenhuma notificação criada ainda.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Que tal criar sua primeira notificação para os usuários?
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      <Badge className={getTypeColor(notification.type)}>
                        {getTypeName(notification.type)}
                      </Badge>
                      <Badge variant={notification.is_active ? "default" : "secondary"}>
                        {notification.is_active ? "🟢 Ativa" : "⚫ Inativa"}
                      </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        📅 Criada {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {notification.expires_at && (
                        <span>
                          ⏰ Expira em {formatDistanceToNow(new Date(notification.expires_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({
                        id: notification.id,
                        isActive: notification.is_active
                      })}
                      className="text-xs"
                    >
                      {notification.is_active ? '⏸️ Pausar' : '▶️ Ativar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(notification)}
                      className="text-xs"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotificationMutation.mutate(notification.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
