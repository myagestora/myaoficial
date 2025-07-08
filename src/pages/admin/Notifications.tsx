
import React from 'react';
import { NotificationsManager } from '@/components/admin/NotificationsManager';

const AdminNotificationsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <NotificationsManager />
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
