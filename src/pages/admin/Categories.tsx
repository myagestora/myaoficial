import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IconSelector from '@/components/admin/IconSelector';

const AdminCategories = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#3B82F6',
    icon: 'folder',
    is_default: true
  });

  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      
      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
      return data;
    }
  });

  const { data: profiles } = useQuery({
    queryKey: ['category-profiles'],
    queryFn: async () => {
      if (!categories) return {};
      
      const userIds = categories
        .filter(cat => !cat.is_default && cat.user_id)
        .map(cat => cat.user_id);
      
      if (userIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, whatsapp')
        .in('id', userIds);
      
      if (error) {
        console.error('Error fetching profiles:', error);
        return {};
      }
      
      return data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
    },
    enabled: !!categories
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: typeof newCategory) => {
      const { error } = await supabase
        .from('categories')
        .insert({
          ...categoryData,
          user_id: '00000000-0000-0000-0000-000000000000'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsCreating(false);
      setNewCategory({ name: '', type: 'expense', color: '#3B82F6', icon: 'folder', is_default: true });
      toast({
        title: 'Sucesso!',
        description: 'Categoria criada com sucesso.',
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...categoryData }: any) => {
      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setEditingCategory(null);
      toast({
        title: 'Sucesso!',
        description: 'Categoria atualizada com sucesso.',
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
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({
        title: 'Sucesso!',
        description: 'Categoria removida com sucesso.',
      });
    }
  });

  const defaultCategories = categories?.filter((cat: any) => cat.is_default) || [];
  const userCategories = categories?.filter((cat: any) => !cat.is_default) || [];

  const filteredUserCategories = userCategories.filter((category: any) => {
    const searchLower = searchTerm.toLowerCase();
    const categoryName = category.name.toLowerCase();
    const profile = profiles?.[category.user_id];
    const userName = profile?.full_name?.toLowerCase() || '';
    const userPhone = profile?.whatsapp?.toLowerCase() || '';
    
    return categoryName.includes(searchLower) || 
           userName.includes(searchLower) || 
           userPhone.includes(searchLower);
  });

  const handleCreateCategory = () => {
    createCategoryMutation.mutate(newCategory);
  };

  const handleUpdateCategory = () => {
    if (editingCategory) {
      updateCategoryMutation.mutate(editingCategory);
    }
  };

  const startEditing = (category: any) => {
    setEditingCategory({ ...category });
  };

  const cancelEditing = () => {
    setEditingCategory(null);
  };

  const getTypeBadge = (type: string) => {
    if (type === 'income') {
      return (
        <Badge 
          variant="outline" 
          className="border-green-500 text-green-700 bg-green-50"
        >
          Receita
        </Badge>
      );
    } else {
      return (
        <Badge 
          variant="outline" 
          className="border-red-500 text-red-700 bg-red-50"
        >
          Despesa
        </Badge>
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Categorias</h1>
          <p className="text-gray-600 dark:text-gray-400">Administre todas as categorias do sistema</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria Padrão
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Nova Categoria Padrão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da categoria"
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select 
                  value={newCategory.type} 
                  onValueChange={(value: 'income' | 'expense') => setNewCategory(prev => ({ ...prev, type: value }))}
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                    className="w-16 h-10"
                  />
                  <Input
                    value={newCategory.color}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <IconSelector
                value={newCategory.icon}
                onValueChange={(icon) => setNewCategory(prev => ({ ...prev, icon }))}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => createCategoryMutation.mutate(newCategory)}>
                Criar Categoria
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingCategory && (
        <Card>
          <CardHeader>
            <CardTitle>Editar Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da categoria"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Tipo</Label>
                <Select 
                  value={editingCategory.type} 
                  onValueChange={(value: 'income' | 'expense') => setEditingCategory(prev => ({ ...prev, type: value }))}
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-color">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-color"
                    type="color"
                    value={editingCategory.color}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, color: e.target.value }))}
                    className="w-16 h-10"
                  />
                  <Input
                    value={editingCategory.color}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <IconSelector
                value={editingCategory.icon}
                onValueChange={(icon) => setEditingCategory(prev => ({ ...prev, icon }))}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => updateCategoryMutation.mutate(editingCategory)}>
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setEditingCategory(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="default" className="space-y-6">
        <TabsList>
          <TabsTrigger value="default">Categorias Padrão ({defaultCategories.length})</TabsTrigger>
          <TabsTrigger value="user">Categorias de Usuários ({userCategories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="default">
          <Card>
            <CardHeader>
              <CardTitle>Categorias Padrão do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Ícone</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaultCategories.map((category: any) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        {getTypeBadge(category.type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.color}
                        </div>
                      </TableCell>
                      <TableCell>{category.icon}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Categorias Criadas por Usuários</CardTitle>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar por categoria, nome ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-80"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Criador</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUserCategories.map((category: any) => {
                    const profile = profiles?.[category.user_id];
                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          {getTypeBadge(category.type)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            {category.color}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {profile?.full_name || 'Usuário sem nome'}
                            </span>
                            {profile?.whatsapp && (
                              <span className="text-sm text-gray-500">
                                {profile.whatsapp}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCategoryMutation.mutate(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUserCategories.length === 0 && searchTerm && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhuma categoria encontrada para "{searchTerm}"
                      </TableCell>
                    </TableRow>
                  )}
                  {userCategories.length === 0 && !searchTerm && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhuma categoria de usuário encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCategories;
