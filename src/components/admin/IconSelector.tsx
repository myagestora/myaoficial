
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Folder, 
  Home, 
  Car, 
  ShoppingCart, 
  Coffee, 
  Gamepad2, 
  Heart, 
  Book, 
  Briefcase, 
  Plane, 
  Music, 
  Camera, 
  Gift, 
  Pizza, 
  Shirt, 
  Smartphone, 
  Fuel, 
  Hospital, 
  GraduationCap, 
  Dumbbell,
  DollarSign,
  CreditCard,
  Banknote,
  Wallet,
  TrendingUp,
  Receipt,
  Calculator,
  Target,
  Building,
  Users
} from 'lucide-react';

const availableIcons = [
  { name: 'folder', icon: Folder, category: 'Geral' },
  { name: 'home', icon: Home, category: 'Casa' },
  { name: 'car', icon: Car, category: 'Transporte' },
  { name: 'shopping-cart', icon: ShoppingCart, category: 'Compras' },
  { name: 'coffee', icon: Coffee, category: 'Alimentação' },
  { name: 'pizza', icon: Pizza, category: 'Alimentação' },
  { name: 'gamepad-2', icon: Gamepad2, category: 'Entretenimento' },
  { name: 'music', icon: Music, category: 'Entretenimento' },
  { name: 'camera', icon: Camera, category: 'Entretenimento' },
  { name: 'heart', icon: Heart, category: 'Saúde' },
  { name: 'hospital', icon: Hospital, category: 'Saúde' },
  { name: 'dumbbell', icon: Dumbbell, category: 'Saúde' },
  { name: 'book', icon: Book, category: 'Educação' },
  { name: 'graduation-cap', icon: GraduationCap, category: 'Educação' },
  { name: 'briefcase', icon: Briefcase, category: 'Trabalho' },
  { name: 'building', icon: Building, category: 'Trabalho' },
  { name: 'plane', icon: Plane, category: 'Viagem' },
  { name: 'gift', icon: Gift, category: 'Presentes' },
  { name: 'shirt', icon: Shirt, category: 'Roupas' },
  { name: 'smartphone', icon: Smartphone, category: 'Tecnologia' },
  { name: 'fuel', icon: Fuel, category: 'Transporte' },
  { name: 'dollar-sign', icon: DollarSign, category: 'Financeiro' },
  { name: 'credit-card', icon: CreditCard, category: 'Financeiro' },
  { name: 'banknote', icon: Banknote, category: 'Financeiro' },
  { name: 'wallet', icon: Wallet, category: 'Financeiro' },
  { name: 'trending-up', icon: TrendingUp, category: 'Financeiro' },
  { name: 'receipt', icon: Receipt, category: 'Financeiro' },
  { name: 'calculator', icon: Calculator, category: 'Financeiro' },
  { name: 'target', icon: Target, category: 'Metas' },
  { name: 'users', icon: Users, category: 'Social' }
];

interface IconSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const IconSelector = ({ value, onValueChange }: IconSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = ['Todos', ...Array.from(new Set(availableIcons.map(icon => icon.category)))];

  const filteredIcons = availableIcons.filter(icon => {
    const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         icon.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || icon.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedIcon = availableIcons.find(icon => icon.name === value);
  const SelectedIconComponent = selectedIcon?.icon || Folder;

  return (
    <div>
      <Label htmlFor="icon">Ícone</Label>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-12 h-10 p-0">
              <SelectedIconComponent className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Buscar ícone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <div className="flex flex-wrap gap-1 mb-3">
                  {categories.map(category => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                {filteredIcons.map(({ name, icon: IconComponent }) => (
                  <Button
                    key={name}
                    variant={value === name ? "default" : "outline"}
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => onValueChange(name)}
                    title={name}
                  >
                    <IconComponent className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              
              {filteredIcons.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum ícone encontrado
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          id="icon"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Nome do ícone"
          className="flex-1"
        />
      </div>
    </div>
  );
};

export default IconSelector;
