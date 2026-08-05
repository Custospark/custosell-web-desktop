import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, ShieldCheck, X } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { selectClass, inputClass } from '../../../shared/utils/inputStyles';
import { usePlans } from '../api/PlanQueries';
import type {
  PlatformAccountType,
  PlatformPrivilegesPayload,
  PlatformSubscriptionStatus,
  PlatformUser,
} from '../api/PlatformTypes';

export interface PlatformUserPrivilegesModalProps {
  open: boolean;
  users: PlatformUser[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (payload: PlatformPrivilegesPayload) => void;
}

const ACCOUNT_TYPES: { value: PlatformAccountType; label: string }[] = [
  { value: 'business', label: 'Business' },
  { value: 'personal', label: 'Personal' },
  { value: 'storefront_buyer', label: 'Storefront buyer' },
];

const SUBSCRIPTION_STATUSES: { value: PlatformSubscriptionStatus; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PlatformUserPrivilegesModal({
  open,
  users,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformUserPrivilegesModalProps) {
  const { data: plans = [] } = usePlans();
  const isBulk = users.length > 1;
  const single = users[0] ?? null;
  const singleSub = single?.subscription;

  const activePlans = useMemo(() => plans.filter((p) => p.is_active), [plans]);

  const [accountType, setAccountType] = useState<PlatformAccountType | ''>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [planId, setPlanId] = useState<number | ''>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | ''>('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<PlatformSubscriptionStatus | ''>('');
  const [onboardingFeePaid, setOnboardingFeePaid] = useState<boolean | ''>('');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [touched, setTouched] = useState(false);

  if (!open || users.length === 0) return null;

  const emailInvalid = email !== '' && !EMAIL_RE.test(email);
  const passwordTooShort = password !== '' && password.length < 8;
  const hasAnyChange =
    accountType !== '' || email !== '' || password !== '' || planId !== ''
    || billingCycle !== '' || subscriptionStatus !== '' || onboardingFeePaid !== ''
    || nextBillingDate !== '';
  const canSubmit = hasAnyChange && !emailInvalid && !passwordTooShort;

  const buildPayload = (): PlatformPrivilegesPayload => {
    const payload: PlatformPrivilegesPayload = {};
    if (accountType) payload.account_type = accountType;
    if (email) payload.email = email;
    if (password) payload.password = password;
    if (planId) payload.plan_id = Number(planId);
    if (billingCycle) payload.billing_cycle = billingCycle;
    if (subscriptionStatus) payload.subscription_status = subscriptionStatus;
    if (onboardingFeePaid !== '') payload.onboarding_fee_paid = onboardingFeePaid;
    if (nextBillingDate) payload.next_billing_date = nextBillingDate;
    return payload;
  };

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;
    onConfirm(buildPayload());
  };

  const title = isBulk
    ? `Set privileges for ${users.length} users`
    : `Privileges — ${single?.name}`;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={isPending ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 pr-6">
              <div className="p-2.5 rounded-full shrink-0 bg-indigo-50">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Grant access and fix accounts: plan, subscription status, onboarding fee, account
                  type, email, and password. Only fields you change are applied.
                </p>
              </div>
            </div>

            {isBulk && (
              <ul className="mt-4 max-h-28 overflow-y-auto text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg divide-y divide-gray-100">
                {users.map((u) => (
                  <li key={u.id} className="px-3 py-2 truncate">{u.name} · {u.email}</li>
                ))}
              </ul>
            )}

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
              noValidate
            >
              {!isBulk && singleSub && (
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600">
                  Current: <span className="font-medium">{singleSub.plan_name ?? 'No plan'}</span> ·{' '}
                  {singleSub.status} · {singleSub.onboarding_fee_paid ? 'onboarding paid' : 'onboarding unpaid'}
                  {singleSub.next_billing_date ? ` · next billing ${new Date(singleSub.next_billing_date).toLocaleDateString()}` : ''}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Account type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as PlatformAccountType | '')}
                  disabled={isPending}
                  className={selectClass}
                >
                  <option value="">Keep current</option>
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan</label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : '')}
                    disabled={isPending}
                    className={selectClass}
                  >
                    <option value="">Keep current plan</option>
                    {activePlans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {!singleSub && planId !== '' && (
                    <p className="text-xs text-emerald-600 mt-1">Creates and activates this plan.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly' | '')}
                    disabled={isPending}
                    className={selectClass}
                  >
                    <option value="">Keep current</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subscription status</label>
                  <select
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value as PlatformSubscriptionStatus | '')}
                    disabled={isPending}
                    className={selectClass}
                  >
                    <option value="">Keep current</option>
                    {SUBSCRIPTION_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Onboarding fee</label>
                  <select
                    value={onboardingFeePaid}
                    onChange={(e) => setOnboardingFeePaid(e.target.value === '' ? '' : e.target.value === 'paid')}
                    disabled={isPending}
                    className={selectClass}
                  >
                    <option value="">Keep current</option>
                    <option value="paid">Mark as paid</option>
                    <option value="unpaid">Mark as unpaid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Next billing date</label>
                <input
                  type="date"
                  value={nextBillingDate}
                  onChange={(e) => setNextBillingDate(e.target.value)}
                  disabled={isPending}
                  className={inputClass}
                />
              </div>

              <div className="my-1 border-t border-gray-100" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  placeholder="Fix a wrong signup email"
                  className={cn(inputClass, emailInvalid && 'border-red-500')}
                />
                {emailInvalid && (
                  <p className="text-xs text-red-600 mt-1">Enter a valid email address.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  placeholder="Set a new password for this account"
                  className={cn(inputClass, passwordTooShort && 'border-red-500')}
                />
                {passwordTooShort && (
                  <p className="text-xs text-red-600 mt-1">Password must be at least 8 characters.</p>
                )}
              </div>

              {touched && !canSubmit && (
                <p className="text-xs text-red-600">Change at least one field to continue.</p>
              )}

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Admin is the last line of defense: email and password changes are audited and
                  take effect immediately. Subscription changes also grant access right away.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !canSubmit}>
                  {isPending ? 'Saving...' : 'Apply privileges'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
