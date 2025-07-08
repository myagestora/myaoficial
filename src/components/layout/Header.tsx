
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    onMenuToggle();
  };

  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobileMenu}
          className="lg:hidden"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">
            {isAdminRoute ? 'Admin Panel' : 'Mya Finance'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <InstallPWAButton />
        <NotificationBell />
        
        {isAdmin && (
          <Link to="/admin/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-red-600 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
