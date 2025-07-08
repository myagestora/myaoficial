
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionWithProfile } from '@/types/subscription';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useSubscriptionActions } from '@/hooks/useSubscriptionActions';
import { SubscriptionDetailsDialog } from '@/components/admin/subscriptions/SubscriptionDetailsDialog';
import { EditSubscriptionDialog } from '@/components/admin/subscriptions/EditSubscriptionDialog';
import { SubscriptionsTable } from '@/components/admin/subscriptions/SubscriptionsTable';
import { SubscriptionsHeader } from '@/components/admin/subscriptions/SubscriptionsHeader';

const AdminSubscriptions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithProfile | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: subscriptions, isLoading } = useSubscriptions();
  const { cancelSubscription, reactivateSubscription } = useSubscriptionActions();

  const filteredSubscriptions = subscriptions?.filter(subscription => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      subscription.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      subscription.profiles?.email?.toLowerCase().includes(searchLower) ||
      subscription.subscription_plans?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleView = (subscription: SubscriptionWithProfile) => {
    setSelectedSubscription(subscription);
    setDetailsOpen(true);
  };

  const handleEdit = (subscription: SubscriptionWithProfile) => {
    setSelectedSubscription(subscription);
    setEditOpen(true);
  };

  const handleCancel = (subscription: SubscriptionWithProfile) => {
    if (confirm('Tem certeza que deseja cancelar esta assinatura?')) {
      cancelSubscription(subscription.id);
    }
  };

  const handleReactivate = (subscription: SubscriptionWithProfile) => {
    if (confirm('Tem certeza que deseja reativar esta assinatura?')) {
      reactivateSubscription(subscription.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <SubscriptionsHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        subscriptionsCount={filteredSubscriptions?.length || 0}
      />

      <Card>
        <CardHeader>
          <CardTitle>Assinaturas ({filteredSubscriptions?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionsTable
            subscriptions={filteredSubscriptions || []}
            isLoading={isLoading}
            onView={handleView}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onReactivate={handleReactivate}
            searchTerm={searchTerm}
          />
        </CardContent>
      </Card>

      <SubscriptionDetailsDialog
        subscription={selectedSubscription}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <EditSubscriptionDialog
        subscription={selectedSubscription}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
};

export default AdminSubscriptions;
