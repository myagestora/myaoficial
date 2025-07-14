import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MobileSelect, 
  MobileSelectTrigger, 
  MobileSelectValue, 
  MobileSelectContent, 
  MobileSelectItem 
} from '@/components/mobile/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ArrowLeft, Grid3X3, Edit } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { MobileOptimizedCard } from '@/components/ui/mobile-optimized-card';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { InlineConfirmation } from '@/components/ui/inline-confirmation';

const COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722',
];

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
      setIsEditing(false);
      setEditingCategory(null);
      setNewCategory({ name: '', type: 'expense', color: '#2196F3', icon: 'circle' });
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
      setDeletingId(null);
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
  const filteredCategories = selectedTab === 'income' ? incomeCategories : expenseCategories;

  // Funções de confirmação para exclusão
  const confirmDelete = (categoryId: string) => {
    setDeletingId(categoryId);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const handleDelete = (categoryId: string) => {
    deleteCategoryMutation.mutate(categoryId);
  };

  // Função para obter o label do tipo
  const getTypeLabel = (type: 'income' | 'expense') => {
    return type === 'income' ? 'Receita' : 'Despesa';
  };

  // Funções de edição
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
      <MobilePageWrapper>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <MobileOptimizedCard key={i} className="animate-pulse">
              <div className="p-4">
                <div className="h-16 bg-muted rounded" />
              </div>
            </MobileOptimizedCard>
          ))}
        </div>
      </MobilePageWrapper>
    );
  }

  if (isCreating || isEditing) {
    return (
      <MobilePageWrapper>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isCreating ? setIsCreating(false) : cancelEdit()}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{isCreating ? 'Nova Categoria' : 'Editar Categoria'}</h1>
            <div className="w-9" /> {/* Spacer */}
          </div>

          <MobileOptimizedCard>
            <div className="space-y-4">
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
                  onValueChange={(value: 'income' | 'expense') => 
                    setNewCategory(prev => ({ ...prev, type: value }))
                  }
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

              <div className="space-y-3">
                <Label className="text-sm font-medium">Cor</Label>
                <div className="grid grid-cols-8 gap-3">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newCategory.color === color 
                          ? 'border-foreground scale-110' 
                          : 'border-muted-foreground/30'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={() => {
                    if (isCreating) {
                      createCategoryMutation.mutate(newCategory);
                    } else {
                      updateCategoryMutation.mutate({ id: editingCategory.id, categoryData: newCategory });
                    }
                  }}
                  disabled={!newCategory.name.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="w-full h-12 text-base"
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending 
                    ? (isCreating ? 'Criando...' : 'Salvando...') 
                    : (isCreating ? 'Criar Categoria' : 'Salvar Alterações')
                  }
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => isCreating ? setIsCreating(false) : cancelEdit()}
                  className="w-full h-12 text-base"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </MobileOptimizedCard>
        </div>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper className="bg-gradient-to-br from-background to-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center text-foreground">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg mr-3">
            <Grid3X3 className="h-6 w-6 text-primary" />
          </div>
          Categorias
        </h1>
        <Button onClick={() => setIsCreating(true)} size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md border-0">
          <Plus className="mr-2 h-4 w-4" />
          Nova
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-3 mb-6">
        <Button
          variant={selectedTab === 'expense' ? 'default' : 'outline'}
          size="sm"
          className={`flex-1 shadow-md ${selectedTab === 'expense' ? 'bg-gradient-to-r from-primary to-primary/80' : 'border-primary/20'}`}
          onClick={() => setSelectedTab('expense')}
        >
          Despesas ({expenseCategories.length})
        </Button>
        <Button
          variant={selectedTab === 'income' ? 'default' : 'outline'}
          size="sm"
          className={`flex-1 shadow-md ${selectedTab === 'income' ? 'bg-gradient-to-r from-primary to-primary/80' : 'border-primary/20'}`}
          onClick={() => setSelectedTab('income')}
        >
          Receitas ({incomeCategories.length})
        </Button>
      </div>

      {/* Lista de categorias */}
      <div className="space-y-3">
        {filteredCategories.map(category => (
          <div key={category.id} className="space-y-2">
            <MobileOptimizedCard>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border border-muted-foreground/20"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{category.name}</span>
                    {(category as any).is_default && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        Padrão
                      </Badge>
                    )}
                  </div>
                </div>
                {!(category as any).is_default && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(category)}
                      className="p-2 h-auto text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(category.id)}
                      className="p-2 h-auto text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </MobileOptimizedCard>
            
            {/* Confirmação de exclusão */}
            {deletingId === category.id && (
              <InlineConfirmation
                message={`Confirmar exclusão da categoria "${category.name}"?`}
                onConfirm={() => handleDelete(category.id)}
                onCancel={cancelDelete}
                confirmText="Excluir"
                cancelText="Cancelar"
              />
            )}
          </div>
        ))}
        
        {filteredCategories.length === 0 && (
          <MobileOptimizedCard className="p-6">
            <div className="text-center">
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
          </MobileOptimizedCard>
        )}
      </div>
    </MobilePageWrapper>
  );
};