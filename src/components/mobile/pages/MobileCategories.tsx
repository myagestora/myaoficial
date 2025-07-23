import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileSelect, MobileSelectTrigger, MobileSelectValue, MobileSelectContent, MobileSelectItem } from '@/components/mobile/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ArrowLeft, Grid3X3, Edit, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { InlineConfirmation } from '@/components/ui/inline-confirmation';
import { SYSTEM_COLORS } from '@/lib/colors';

const ICONS = [
  'circle', 'home', 'car', 'utensils', 'heart', 'book',
  'briefcase', 'gamepad-2', 'shopping-cart', 'banknote',
  'trending-up', 'coffee', 'plane', 'music', 'camera',
];

export const MobileCategories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'income' | 'expense'>('expense');
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#2196F3',
    icon: 'circle',
  });

  const { data: categories, isLoading } = useQuery({
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
        .insert({ ...categoryData, user_id: user.id, is_default: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCreating(false);
      setIsEditing(false);
      setEditingCategory(null);
      setNewCategory({ name: '', type: 'expense', color: '#2196F3', icon: 'circle' });
      toast({ title: 'Sucesso', description: 'Categoria criada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao criar categoria', variant: 'destructive' });
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
      setDeletingId(null);
      toast({ title: 'Sucesso', description: 'Categoria removida com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao remover categoria', variant: 'destructive' });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, categoryData }: { id: string; categoryData: typeof newCategory }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('categories')
        .update({
          name: categoryData.name,
          type: categoryData.type,
          color: categoryData.color,
          icon: categoryData.icon,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsEditing(false);
      setEditingCategory(null);
      setNewCategory({ name: '', type: 'expense', color: '#2196F3', icon: 'circle' });
      toast({ title: 'Sucesso', description: 'Categoria atualizada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao atualizar categoria', variant: 'destructive' });
    }
  });

  const incomeCategories = categories?.filter(cat => cat.type === 'income') || [];
  const expenseCategories = categories?.filter(cat => cat.type === 'expense') || [];
  const filteredCategories = selectedTab === 'income' ? incomeCategories : expenseCategories;

  // Funções de confirmação para exclusão
  const confirmDelete = (categoryId: string) => setDeletingId(categoryId);
  const cancelDelete = () => setDeletingId(null);
  const handleDelete = (categoryId: string) => deleteCategoryMutation.mutate(categoryId);
  const getTypeLabel = (type: 'income' | 'expense') => type === 'income' ? 'Receita' : 'Despesa';
  const startEdit = (category: any) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon || 'circle',
    });
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setIsEditing(false);
    setEditingCategory(null);
    setNewCategory({ name: '', type: 'expense', color: '#2196F3', icon: 'circle' });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (isCreating || isEditing) {
    return (
      <div className="max-w-2xl mx-auto p-2 space-y-4">
        {/* Header padrão mobile */}
        <div className="flex items-center gap-2 mb-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => isCreating ? setIsCreating(false) : cancelEdit()}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-base font-semibold text-gray-900">{isCreating ? 'Nova Categoria' : 'Editar Categoria'}</h1>
        </div>
        <form className="bg-white rounded-lg shadow-sm p-4 border space-y-4" onSubmit={e => { e.preventDefault(); if (isCreating) { createCategoryMutation.mutate(newCategory); } else { updateCategoryMutation.mutate({ id: editingCategory.id, categoryData: newCategory }); } }}>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nome da Categoria</Label>
            <Input
              placeholder="Digite o nome da categoria"
              value={newCategory.name}
              onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo</Label>
            <MobileSelect
              value={newCategory.type}
              onValueChange={(value: 'income' | 'expense') => setNewCategory(prev => ({ ...prev, type: value }))}
            >
              <MobileSelectTrigger>
                <MobileSelectValue>
                  {getTypeLabel(newCategory.type)}
                </MobileSelectValue>
              </MobileSelectTrigger>
              <MobileSelectContent>
                <MobileSelectItem value="income">Receita</MobileSelectItem>
                <MobileSelectItem value="expense">Despesa</MobileSelectItem>
              </MobileSelectContent>
            </MobileSelect>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cor</Label>
            <div className="relative">
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 hide-scrollbar pr-8">
                {SYSTEM_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${newCategory.color === color ? 'border-foreground scale-110' : 'border-muted-foreground/30'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
              {/* Gradiente à direita */}
              <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white via-white/80 to-transparent" />
              {/* Ícone de seta */}
              <div className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 flex items-center justify-center">
                <ChevronRight size={18} className="text-muted-foreground/70" />
              </div>
            </div>
          </div>
          <div className="flex space-x-3 pt-4">
            <Button 
              type="submit"
              className="flex-1"
              disabled={!newCategory.name.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending || updateCategoryMutation.isPending 
                ? (isCreating ? 'Criando...' : 'Salvando...') 
                : (isCreating ? 'Criar Categoria' : 'Salvar Alterações')
              }
            </Button>
            <Button 
              type="button"
              variant="outline" 
              className="flex-1"
              onClick={() => isCreating ? setIsCreating(false) : cancelEdit()}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-2 space-y-4">
      {/* Header padrão mobile */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Grid3X3 className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Categorias</h1>
          <p className="text-[11px] text-gray-400">Organize suas transações</p>
        </div>
        <div className="ml-auto flex gap-1">
          <Button onClick={() => setIsCreating(true)} size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md border-0">
            <Plus className="mr-2 h-4 w-4" />
            Nova
          </Button>
        </div>
      </div>
      {/* Tabs em linha única scrollável */}
      <div className="flex flex-nowrap gap-1 overflow-x-auto pb-1 hide-scrollbar mb-2">
        <Button
          variant={selectedTab === 'expense' ? 'default' : 'outline'}
          size="sm"
          className="min-w-[110px] flex-shrink-0"
          onClick={() => setSelectedTab('expense')}
        >
          Despesas ({expenseCategories.length})
        </Button>
        <Button
          variant={selectedTab === 'income' ? 'default' : 'outline'}
          size="sm"
          className="min-w-[110px] flex-shrink-0"
          onClick={() => setSelectedTab('income')}
        >
          Receitas ({incomeCategories.length})
        </Button>
      </div>
      {/* Lista de categorias */}
      <div className="space-y-2">
        {filteredCategories.map(category => (
          <React.Fragment key={category.id}>
            <div className="rounded-xl border border-gray-100 shadow-sm p-3 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border border-muted-foreground/20" style={{ backgroundColor: category.color }} />
                <span className="font-medium text-sm text-gray-900 truncate">{category.name}</span>
                {(category as any).is_default && (
                  <Badge variant="secondary" className="text-xs w-fit">Padrão</Badge>
                )}
              </div>
              {!(category as any).is_default && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(category)}
                    className="p-2 h-auto text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(category.id)}
                    className="p-2 h-auto text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {/* Confirmação de exclusão inline */}
            {deletingId === category.id && (
              <div className="bg-white border border-red-200 rounded-xl shadow-sm mt-2 p-4 flex flex-col items-center gap-3">
                <span className="text-sm text-center">Confirmar exclusão da categoria "{category.name}"?</span>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(category.id)}>Excluir</Button>
                  <Button size="sm" variant="outline" onClick={cancelDelete}>Cancelar</Button>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
        {filteredCategories.length === 0 && (
          <div className="p-6 text-center bg-white rounded-xl border border-gray-100 shadow-sm">
            <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">
              Nenhuma categoria de {selectedTab === 'income' ? 'receita' : 'despesa'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie categorias personalizadas para organizar melhor suas transações
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus size={16} className="mr-2" />
              Criar primeira categoria
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};