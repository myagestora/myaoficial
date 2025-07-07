
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface MotivationalPhrase {
  id: string;
  phrase: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const MotivationalPhrasesManager = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPhrase, setEditingPhrase] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: phrases, isLoading } = useQuery({
    queryKey: ['motivational-phrases-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivational_phrases' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MotivationalPhrase[];
    }
  });

  const createPhraseMutation = useMutation({
    mutationFn: async (phrase: string) => {
      const { data, error } = await supabase
        .from('motivational_phrases' as any)
        .insert([{ phrase, is_active: true }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivational-phrases-admin'] });
      queryClient.invalidateQueries({ queryKey: ['motivational-phrase'] });
      setNewPhrase('');
      setShowAddForm(false);
      toast({
        title: 'Sucesso',
        description: 'Frase criada com sucesso',
      });
    },
    onError: (error) => {
      console.error('Erro ao criar frase:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar frase',
        variant: 'destructive',
      });
    }
  });

  const updatePhraseMutation = useMutation({
    mutationFn: async ({ id, phrase }: { id: string; phrase: string }) => {
      const { data, error } = await supabase
        .from('motivational_phrases' as any)
        .update({ phrase, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivational-phrases-admin'] });
      queryClient.invalidateQueries({ queryKey: ['motivational-phrase'] });
      setEditingId(null);
      setEditingPhrase('');
      toast({
        title: 'Sucesso',
        description: 'Frase atualizada com sucesso',
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar frase:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar frase',
        variant: 'destructive',
      });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('motivational_phrases' as any)
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivational-phrases-admin'] });
      queryClient.invalidateQueries({ queryKey: ['motivational-phrase'] });
      toast({
        title: 'Sucesso',
        description: 'Status da frase atualizado',
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status da frase',
        variant: 'destructive',
      });
    }
  });

  const deletePhraseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('motivational_phrases' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivational-phrases-admin'] });
      queryClient.invalidateQueries({ queryKey: ['motivational-phrase'] });
      toast({
        title: 'Sucesso',
        description: 'Frase removida com sucesso',
      });
    },
    onError: (error) => {
      console.error('Erro ao remover frase:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover frase',
        variant: 'destructive',
      });
    }
  });

  const handleStartEdit = (phrase: MotivationalPhrase) => {
    setEditingId(phrase.id);
    setEditingPhrase(phrase.phrase);
  };

  const handleSaveEdit = () => {
    if (editingId && editingPhrase.trim()) {
      updatePhraseMutation.mutate({ id: editingId, phrase: editingPhrase.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingPhrase('');
  };

  const handleCreatePhrase = () => {
    if (newPhrase.trim()) {
      createPhraseMutation.mutate(newPhrase.trim());
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ id, is_active: !currentStatus });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta frase?')) {
      deletePhraseMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div>Carregando frases...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Frases Motivacionais
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Frase
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="space-y-3">
              <Label htmlFor="new-phrase">Nova Frase Motivacional</Label>
              <Input
                id="new-phrase"
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                placeholder="Digite a nova frase..."
                onKeyPress={(e) => e.key === 'Enter' && handleCreatePhrase()}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCreatePhrase}
                  disabled={!newPhrase.trim() || createPhraseMutation.isPending}
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPhrase('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {phrases?.map((phrase) => (
            <div key={phrase.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 mr-4">
                {editingId === phrase.id ? (
                  <Input
                    value={editingPhrase}
                    onChange={(e) => setEditingPhrase(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    className="mr-2"
                  />
                ) : (
                  <p className={`text-sm ${!phrase.is_active ? 'text-gray-500' : ''}`}>
                    {phrase.phrase}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={phrase.is_active}
                    onCheckedChange={() => handleToggleActive(phrase.id, phrase.is_active)}
                    disabled={toggleActiveMutation.isPending}
                  />
                  <span className="text-xs text-gray-500">
                    {phrase.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                
                {editingId === phrase.id ? (
                  <div className="flex gap-1">
                    <Button
                      onClick={handleSaveEdit}
                      disabled={updatePhraseMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      size="sm"
                      variant="outline"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleStartEdit(phrase)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(phrase.id)}
                      disabled={deletePhraseMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {phrases?.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            Nenhuma frase cadastrada ainda.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
