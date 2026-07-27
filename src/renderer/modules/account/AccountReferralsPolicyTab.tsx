import { ScrollText, Gift, DollarSign, Users, Clock, Ban, HelpCircle } from 'lucide-react';

export default function AccountReferralsPolicyTab() {
  const sections = [
    {
      icon: Gift,
      title: 'How It Works',
      content: 'Share your unique referral code with other businesses. When they subscribe to Custosell using your code, both you and the referred business earn rewards.',
    },
    {
      icon: DollarSign,
      title: 'Rewards',
      content: 'For every business that signs up using your referral code and completes onboarding, you earn a reward based on their selected plan. Rewards are calculated as a percentage of the monthly subscription price or a flat amount, depending on the active campaign.',
    },
    {
      icon: Users,
      title: 'Referral Limits',
      content: 'There is no limit to the number of businesses you can refer. Each qualified referral earns you a reward. However, each referred business can only use one referral code during their lifetime on Custosell.',
    },
    {
      icon: Clock,
      title: 'Payout Schedule',
      content: 'Rewards become available after the referred business completes onboarding and their subscription becomes active. Payouts are processed according to your selected payout frequency (weekly, biweekly, monthly, or quarterly). You can update your payout preferences in the Payment Information section.',
    },
    {
      icon: Ban,
      title: 'Restrictions',
      content: 'You cannot use your own referral code. Self-referrals are not eligible for rewards. Custosell reserves the right to void referral rewards that result from fraudulent or invalid activity.',
    },
    {
      icon: HelpCircle,
      title: 'Support',
      content: 'If you have questions about the referral program, payouts, or your rewards, visit the Contact & Help page under the Custosell Guide for assistance.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Referral Program Policy</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Understand how the Custosell referral program works, how rewards are calculated,
          and what you need to do to earn.
        </p>
        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="flex gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{section.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
