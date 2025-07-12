import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MobileRouteHandler } from './MobileRouteHandler';
import { 
  Home, 
  CreditCard, 
  Target, 
  BarChart3, 
  Calendar, 
  Grid3X3, 
  Settings,
  Plus,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { InstallPrompt } from './InstallPrompt';

interface MobileAppLayoutProps {
  children?: React.ReactNode;
}

const navigationItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/transactions', icon: CreditCard, label: 'Transações' },
  { path: '/goals', icon: Target, label: 'Metas' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
];

const moreItems = [
  { path: '/scheduled', icon: Calendar, label: 'Agendadas' },
  { path: '/categories', icon: Grid3X3, label: 'Categorias' },
  { path: '/settings', icon: Settings, label: 'Configurações' },
];

export const MobileAppLayout = ({ children }: MobileAppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentPath = location.pathname;

  const NavItem = ({ path, icon: Icon, label, onClick }: {
    path: string;
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
  }) => {
    const isActive = currentPath === path;
    
    return (
      <button
        onClick={() => {
          navigate(path);
          onClick?.();
        }}
        className={cn(
          "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
          "min-h-[60px] flex-1",
          isActive 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon size={20} className="mb-1" />
        <span className="text-xs font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center space-x-3">
          <img 
            src="https://fimgalqlsezgxqbmktpz.supabase.co/storage/v1/object/public/logos/logo-1751933896307.png" 
            alt="Mya Gestora" 
            className="h-8 w-8"
          />
          <h1 className="text-lg font-semibold">Mya Gestora</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => navigate('/transactions')}
          >
            <Plus size={20} />
          </Button>
          
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X size={20} />
                </Button>
              </div>
              
              <nav className="space-y-2">
                {moreItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center space-x-3 w-full p-3 rounded-lg transition-colors",
                      currentPath === item.path
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 pb-20">
          {children || <MobileRouteHandler />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navigationItems.map((item) => (
            <NavItem
              key={item.path}
              path={item.path}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>
      </nav>

      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  );
};