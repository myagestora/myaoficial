
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';

interface PlanSelectionModalProps {
  onClose: () => void;
}

export const PlanSelectionModal = ({ onClose }: PlanSelectionModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Escolha seu Plano</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6">
            <SubscriptionPlans />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
