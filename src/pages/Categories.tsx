
import React from 'react';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { ModernCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { SYSTEM_COLORS } from '@/lib/colors';
import { Edit } from 'lucide-react';

const Categories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense', color: SYSTEM_COLORS[0] });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['all-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user?.id}`)
        .order('is_default', { ascending: false })
        .order('type')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: typeof newCategory) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('categories')
        .insert({
          ...categoryData,
          user_id: user.id,
          is_default: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setFormOpen(false);
      setNewCategory({ name: '', type: 'expense', color: SYSTEM_COLORS[0] });
      toast({
        title: 'Sucesso',
        description: 'Categoria criada com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao criar categoria',
        variant: 'destructive',
      });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Sucesso',
        description: 'Categoria removida com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao remover categoria',
        variant: 'destructive',
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...rest } = data;
      const { error } = await supabase
        .from('categories')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
      toast({
        title: 'Sucesso',
        description: 'Categoria atualizada com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar categoria',
        variant: 'destructive',
      });
    }
  });

  const incomeCategories = categories.filter(cat => cat.type === 'income');
  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header padrão */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-2">Gerenciar Categorias</h1>
          <p className="text-base md:text-lg text-muted-foreground">Organize suas categorias de receitas e despesas</p>
        </div>
        <Button onClick={() => setFormOpen((v) => !v)} className="min-h-[44px] md:w-auto w-auto md:px-4 px-3 text-base font-medium" size="lg">
          <Plus className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline">Nova Categoria</span>
        </Button>
      </header>
      {formOpen && (
        <ModernCard className="mb-6">
          <div className="font-semibold text-lg mb-4">Criar Nova Categoria</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <Input
                value={newCategory.name}
                onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="Nome da categoria"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <Select value={newCategory.type} onValueChange={value => setNewCategory({ ...newCategory, type: value })}>
                <SelectTrigger>
                  <SelectValue>{newCategory.type === 'income' ? 'Receita' : 'Despesa'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {SYSTEM_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    newCategory.color === color ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => createCategoryMutation.mutate(newCategory)} disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={createCategoryMutation.isPending}>Cancelar</Button>
          </div>
        </ModernCard>
      )}
      <ModernCard>
        <div>
          <h2 className="font-semibold text-xl mb-4">Categorias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-green-600 mb-3">Receitas</h3>
              <div className="space-y-2">
                {incomeCategories.map(category => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                    {(editingCategory && editingCategory.id === category.id) ? (
                      <form className="flex-1 flex flex-col gap-2" onSubmit={e => {
                        e.preventDefault();
                        updateCategoryMutation.mutate({
                          id: editingCategory.id,
                          ...editValues
                        });
                      }}>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <input
                            className="w-32 border rounded px-2 py-1"
                            value={editValues?.name || ''}
                            onChange={e => setEditValues((prev: any) => ({ ...prev, name: e.target.value }))}
                            placeholder="Nome"
                            required
                          />
                          <select
                            className="w-28 border rounded px-2 py-1"
                            value={editValues?.type || 'expense'}
                            onChange={e => setEditValues((prev: any) => ({ ...prev, type: e.target.value }))}
                          >
                            <option value="income">Receita</option>
                            <option value="expense">Despesa</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-1 items-center min-h-[36px] mt-2">
                          {SYSTEM_COLORS.map(color => (
                            <button
                              key={color}
                              type="button"
                              className={`w-6 h-6 rounded-full border-2 ${editValues?.color === color ? 'border-gray-900' : 'border-gray-300'}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditValues((prev: any) => ({ ...prev, color }))}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Salvar</button>
                          <button type="button" className="px-3 py-1 rounded border" onClick={() => setEditingCategory(null)}>Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                          {(category as any).is_default && (
                            <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-xs">Padrão</span>
                          )}
                        </div>
                        {!(category as any).is_default && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-100"
                              onClick={() => {
                                setEditingCategory(category);
                                setEditValues({ name: category.name, type: category.type, color: category.color });
                              }}
                              title="Editar categoria"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-100"
                              onClick={() => setConfirmDeleteId(category.id)}
                              title="Remover categoria"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-red-600 mb-3">Despesas</h3>
              <div className="space-y-2">
                {expenseCategories.map(category => (
                  <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                    {(editingCategory && editingCategory.id === category.id) ? (
                      <form className="flex-1 flex flex-col gap-2" onSubmit={e => {
                        e.preventDefault();
                        updateCategoryMutation.mutate({
                          id: editingCategory.id,
                          ...editValues
                        });
                      }}>
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <input
                            className="w-32 border rounded px-2 py-1"
                            value={editValues?.name || ''}
                            onChange={e => setEditValues((prev: any) => ({ ...prev, name: e.target.value }))}
                            placeholder="Nome"
                            required
                          />
                          <select
                            className="w-28 border rounded px-2 py-1"
                            value={editValues?.type || 'expense'}
                            onChange={e => setEditValues((prev: any) => ({ ...prev, type: e.target.value }))}
                          >
                            <option value="income">Receita</option>
                            <option value="expense">Despesa</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-1 items-center min-h-[36px] mt-2">
                          {SYSTEM_COLORS.map(color => (
                            <button
                              key={color}
                              type="button"
                              className={`w-6 h-6 rounded-full border-2 ${editValues?.color === color ? 'border-gray-900' : 'border-gray-300'}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditValues((prev: any) => ({ ...prev, color }))}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Salvar</button>
                          <button type="button" className="px-3 py-1 rounded border" onClick={() => setEditingCategory(null)}>Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                          {(category as any).is_default && (
                            <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-xs">Padrão</span>
                          )}
                        </div>
                        {!(category as any).is_default && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-100"
                              onClick={() => {
                                setEditingCategory(category);
                                setEditValues({ name: category.name, type: category.type, color: category.color });
                              }}
                              title="Editar categoria"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-100"
                              onClick={() => setConfirmDeleteId(category.id)}
                              title="Remover categoria"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
      </div>
      </ModernCard>
    </div>
  );
};

export default Categories;
