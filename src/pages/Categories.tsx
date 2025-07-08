
import React from 'react';
import { CategoryManager } from '@/components/categories/CategoryManager';

const Categories = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <CategoryManager />
      </div>
    </div>
  );
};

export default Categories;
