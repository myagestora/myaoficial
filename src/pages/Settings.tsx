
import React from 'react';
import { CategoryManager } from '@/components/categories/CategoryManager';

const Settings = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-gray-600 dark:text-gray-400">Gerencie suas categorias e preferências</p>
      </div>
      
      <CategoryManager />
    </div>
  );
};

export default Settings;
