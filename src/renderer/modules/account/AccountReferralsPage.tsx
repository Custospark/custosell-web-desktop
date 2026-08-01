import { ReferralsContent } from '../referral/components/ReferralsContent';

export default function AccountReferralsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referral Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your referral code, earnings, and payout information</p>
      </div>

      <ReferralsContent />
    </div>
  );
}
