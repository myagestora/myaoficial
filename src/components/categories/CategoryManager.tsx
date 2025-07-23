
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Palette, Edit } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SYSTEM_COLORS } from '@/lib/colors';

// Remover COLORS local e usar SYSTEM_COLORS
const ICONS = [
  'circle', 'home', 'car', 'utensils', 'heart', 'book',
  'briefcase', 'gamepad-2', 'shopping-cart', 'banknote',
  'trending-up', 'coffee', 'plane', 'music', 'camera',
];

export const CategoryManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: SYSTEM_COLORS[0],
    icon: 'circle',
  });
  // Adicionar estado para edição de categoria
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>(null);

  const { data: categories } = useQuery({
    queryKey: ['all-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user!.id}`)
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
      setIsCreating(false);
      setNewCategory({ name: '', type: 'expense', color: SYSTEM_COLORS[0], icon: 'circle' });
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

  // Adicionar mutation para update
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
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
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

  const incomeCategories = categories?.filter(cat => cat.type === 'income') || [];
  const expenseCategories = categories?.filter(cat => cat.type === 'expense') || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gerenciar Categorias</CardTitle>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        </CardHeader>
        <CardContent>
          {isCreating && (
            <div className="mb-6 p-4 border rounded-lg space-y-4">
              <h3 className="font-semibold">Criar Nova Categoria</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome da categoria"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newCategory.type}
                    onValueChange={(value: 'income' | 'expense') => 
                      setNewCategory(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2 min-h-[48px]">
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
                <Button onClick={() => createCategoryMutation.mutate(newCategory)}>
                  Criar
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-green-600 mb-3">Receitas</h3>
              <div className="space-y-2">
                {incomeCategories.map(category => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    {(editingCategory && editingCategory.id === category.id) ? (
                      <form className="flex-1 flex flex-col md:flex-row md:items-center gap-2" onSubmit={e => {
                        e.preventDefault();
                        updateCategoryMutation.mutate({
                          id: editingCategory.id,
                          ...editValues
                        });
                      }}>
                        <Input
                          className="w-32"
                          value={editValues?.name || ''}
                          onChange={e => setEditValues((prev: any) => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome"
                          required
                        />
                        <Select
                          value={editValues?.type || 'expense'}
                          onValueChange={value => setEditValues((prev: any) => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Receita</SelectItem>
                            <SelectItem value="expense">Despesa</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-1 items-center min-h-[36px]">
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
                        <div className="flex gap-1">
                          <Button type="submit" size="sm" variant="default">Salvar</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingCategory(null)}>Cancelar</Button>
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
                            <Badge variant="secondary" className="text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>
                        {!(category as any).is_default && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCategory(category);
                                setEditValues({ name: category.name, type: category.type, color: category.color });
                              }}
                              title="Editar categoria"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCategoryMutation.mutate(category.id)}
                              title="Remover categoria"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    {(editingCategory && editingCategory.id === category.id) ? (
                      <form className="flex-1 flex flex-col md:flex-row md:items-center gap-2" onSubmit={e => {
                        e.preventDefault();
                        updateCategoryMutation.mutate({
                          id: editingCategory.id,
                          ...editValues
                        });
                      }}>
                        <Input
                          className="w-32"
                          value={editValues?.name || ''}
                          onChange={e => setEditValues((prev: any) => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome"
                          required
                        />
                        <Select
                          value={editValues?.type || 'expense'}
                          onValueChange={value => setEditValues((prev: any) => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Receita</SelectItem>
                            <SelectItem value="expense">Despesa</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-1 items-center min-h-[36px]">
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
                        <div className="flex gap-1">
                          <Button type="submit" size="sm" variant="default">Salvar</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingCategory(null)}>Cancelar</Button>
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
                            <Badge variant="secondary" className="text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>
                        {!(category as any).is_default && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCategory(category);
                                setEditValues({ name: category.name, type: category.type, color: category.color });
                              }}
                              title="Editar categoria"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCategoryMutation.mutate(category.id)}
                              title="Remover categoria"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
