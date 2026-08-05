import { useMemo, useState } from 'react';
import { CalendarDays, CreditCard, KeyRound, Mail, ShieldCheck, UserCog, Wallet } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import { PipelineFormSection, PipelineIconField, pipelineInputClass, pipelineSelectClass } from '../../pipeline/ui/pipelineFormFields';
import { PipelineModalHero } from '../../pipeline/ui/pipelineFormFields';
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

  const emailInvalid = email !== '' && !EMAIL_RE.test(email);
  const passwordTooShort = password !== '' && password.length < 8;
  const hasAnyChange =
    accountType !== '' || email !== '' || password !== '' || planId !== ''
    || billingCycle !== '' || subscriptionStatus !== '' || onboardingFeePaid !== ''
    || nextBillingDate !== '';
  const canSubmit = hasAnyChange && !emailInvalid && !passwordTooShort;

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

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
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={title}
      subtitle="Grant access and fix accounts"
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={ShieldCheck}
          tone="indigo"
          title={isBulk ? 'Set privileges for several accounts' : `Privileges for ${single?.name}`}
          description="Plan, subscription status, onboarding fee, account type, email, and password. Only fields you change are applied."
        />

        {isBulk && (
          <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="px-3 py-2 truncate text-sm text-gray-800">{u.name} · {u.email}</div>
            ))}
          </div>
        )}

        {!isBulk && singleSub && (
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-xs text-gray-600">
            Current: <span className="font-medium">{singleSub.plan_name ?? 'No plan'}</span> ·{' '}
            {singleSub.status} · {singleSub.onboarding_fee_paid ? 'onboarding paid' : 'onboarding unpaid'}
            {singleSub.next_billing_date ? ` · next billing ${new Date(singleSub.next_billing_date).toLocaleDateString()}` : ''}
          </div>
        )}

        <PipelineFormSection title="Account" icon={UserCog} description="Account type, email, and password override for this user.">
          <div>
            <PipelineIconField label="Account type" icon={UserCog}>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as PlatformAccountType | '')}
                disabled={isPending}
                className={pipelineSelectClass}
              >
                <option value="">Keep current</option>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </PipelineIconField>
          </div>

          <div>
            <PipelineIconField label="Email" icon={Mail}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                placeholder="Fix a wrong signup email"
                aria-invalid={emailInvalid}
                className={cn(
                  pipelineInputClass,
                  emailInvalid && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                )}
              />
            </PipelineIconField>
            {emailInvalid && (
              <p className="mt-1 pl-10 text-xs text-red-600" role="alert">Enter a valid email address.</p>
            )}
          </div>

          <div>
            <PipelineIconField label="Password" icon={KeyRound}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                placeholder="Set a new password for this account"
                aria-invalid={passwordTooShort}
                className={cn(
                  pipelineInputClass,
                  passwordTooShort && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                )}
              />
            </PipelineIconField>
            {passwordTooShort && (
              <p className="mt-1 pl-10 text-xs text-red-600" role="alert">Password must be at least 8 characters.</p>
            )}
          </div>
        </PipelineFormSection>

        <PipelineFormSection title="Subscription" icon={CreditCard} description="Plan, billing cycle, status, onboarding fee, and next billing date.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PipelineIconField label="Plan" icon={CreditCard}>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : '')}
                disabled={isPending}
                className={pipelineSelectClass}
              >
                <option value="">Keep current plan</option>
                {activePlans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </PipelineIconField>
            <PipelineIconField label="Billing cycle" icon={CalendarDays}>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly' | '')}
                disabled={isPending}
                className={pipelineSelectClass}
              >
                <option value="">Keep current</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </PipelineIconField>
          </div>
          {!singleSub && planId !== '' && (
            <p className="text-xs text-emerald-600">Creates and activates this plan.</p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PipelineIconField label="Subscription status" icon={ShieldCheck}>
              <select
                value={subscriptionStatus}
                onChange={(e) => setSubscriptionStatus(e.target.value as PlatformSubscriptionStatus | '')}
                disabled={isPending}
                className={pipelineSelectClass}
              >
                <option value="">Keep current</option>
                {SUBSCRIPTION_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </PipelineIconField>
            <PipelineIconField label="Onboarding fee" icon={Wallet}>
              <select
                value={onboardingFeePaid === '' ? '' : onboardingFeePaid ? 'paid' : 'unpaid'}
                onChange={(e) => setOnboardingFeePaid(e.target.value === '' ? '' : e.target.value === 'paid')}
                disabled={isPending}
                className={pipelineSelectClass}
              >
                <option value="">Keep current</option>
                <option value="paid">Mark as paid</option>
                <option value="unpaid">Mark as unpaid</option>
              </select>
            </PipelineIconField>
          </div>

          <div>
            <PipelineIconField label="Next billing date" icon={CalendarDays}>
              <input
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                disabled={isPending}
                className={pipelineInputClass}
              />
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        {touched && !canSubmit && (
          <p className="text-xs text-red-600" role="alert">Change at least one field to continue.</p>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            Admin is the last line of defense: email and password changes are audited and take effect immediately. Subscription changes also grant access right away.
          </p>
        </div>

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            {isPending ? 'Saving...' : 'Apply privileges'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}