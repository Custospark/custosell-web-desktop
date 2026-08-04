import { useState } from 'react';
import { Shield, KeyRound, BadgeCheck, Activity } from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import SecurityPasswordTab from './security/SecurityPasswordTab';
import SecurityVerificationTab from './security/SecurityVerificationTab';
import SecurityActivityTab from './security/SecurityActivityTab';

const TABS = [
  { id: 'password', label: 'Password', icon: KeyRound },
  { id: 'verification', label: 'Verification', icon: BadgeCheck },
  { id: 'activity', label: 'Activity', icon: Activity },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AccountSecurityPage() {
  const [activeTab, setActiveTab] = useState<TabId>('password');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-1 py-8 sm:px-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
          <Shield className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Account</p>
          <h1 className="text-2xl font-bold text-gray-900">Security</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your password, email verification, two-factor authentication, and sign-in activity.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer',
              activeTab === id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'password' && <SecurityPasswordTab />}
      {activeTab === 'verification' && <SecurityVerificationTab />}
      {activeTab === 'activity' && <SecurityActivityTab />}
    </div>
  );
}
