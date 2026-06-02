import { CreditCard } from 'lucide-react';

export default function SubscriptionSettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <CreditCard className="w-16 h-16 mb-4" />
      <h2 className="text-xl font-semibold text-gray-600 mb-1">Subscription</h2>
      <p className="text-sm">Plan details and upgrades will be managed here</p>
    </div>
  );
}
