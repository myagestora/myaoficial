import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Grid3X3,
  Plus,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  DollarSign
} from 'lucide-react';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const MobileCategories = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'income' | 'expense'>('expense');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${user?.id},is_default.eq.true`)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const filteredCategories = categories?.filter(cat => cat.type === selectedTab) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  if (isLoading) {
    return (
      <MobilePageWrapper>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Grid3X3 className="h-6 w-6 mr-2" />
          Categorias
        </h1>
        <Button 
          size="sm" 
          className="flex items-center space-x-2"
          onClick={() => {
            // TODO: Implementar modal de criação de categoria
            console.log('Criar nova categoria');
          }}
        >
          <Plus size={16} />
          <span>Nova</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={selectedTab === 'expense' ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setSelectedTab('expense')}
        >
          <TrendingDown size={16} className="mr-2" />
          Despesas
        </Button>
        <Button
          variant={selectedTab === 'income' ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setSelectedTab('income')}
        >
          <TrendingUp size={16} className="mr-2" />
          Receitas
        </Button>
      </div>

      {/* Resumo */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Categorias de {selectedTab === 'income' ? 'Receitas' : 'Despesas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{filteredCategories.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredCategories.filter(cat => !cat.is_default).length}
              </p>
              <p className="text-xs text-muted-foreground">Personalizadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de categorias */}
      <div className="grid grid-cols-1 gap-3">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: category.color || '#3B82F6' }}
                  >
                    <span className="text-lg">{category.icon || '📁'}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{category.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant={category.is_default ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {category.is_default ? 'Padrão' : 'Personalizada'}
                      </Badge>
                      <Badge 
                        variant={category.type === 'income' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {category.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!category.is_default && (
                    <>
                      <Button variant="ghost" size="sm">
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Estatísticas da categoria (placeholder para dados reais) */}
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usado este mês</span>
                <span className="font-medium flex items-center">
                  <DollarSign size={12} className="mr-1" />
                  {formatCurrency(Math.random() * 1000)} {/* Substituir por dados reais */}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">
              Nenhuma categoria de {selectedTab === 'income' ? 'receita' : 'despesa'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie categorias personalizadas para organizar melhor suas transações
            </p>
            <Button>
              <Plus size={16} className="mr-2" />
              Criar primeira categoria
            </Button>
          </CardContent>
        </Card>
      )}
    </MobilePageWrapper>
  );
};