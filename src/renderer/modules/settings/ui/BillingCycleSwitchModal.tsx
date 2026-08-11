interface BillingCycleSwitchModalProps {
  pendingCycle: 'monthly' | 'yearly';
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function BillingCycleSwitchModal({
  pendingCycle,
  isPending,
  onConfirm,
  onCancel,
}: BillingCycleSwitchModalProps) {
  const isYearly = pendingCycle === 'yearly';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          Switch to {isYearly ? 'Yearly' : 'Monthly'} Billing?
        </h3>
        <p className="text-sm text-gray-600">
          {isYearly
            ? 'You\'ll be charged the yearly rate immediately, with credit applied for unused days in your current month.'
            : 'This change will take effect at the end of your current billing period.'}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Checking...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
