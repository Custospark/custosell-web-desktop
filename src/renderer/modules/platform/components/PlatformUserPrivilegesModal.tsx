import { useMemo, useState } from 'react';
import { CalendarDays, CreditCard, Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserCog, Wallet } from 'lucide-react';
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
import {
  DATE_FIELD_BY_STATUS,
  DATE_FIELD_LABELS,
  resolveSubscriptionDateField,
  buildPrivilegeChangeRows,
  type SubscriptionDateField,
} from '../utils/privilegeChangeSummary';

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
  const [showPassword, setShowPassword] = useState(false);
  const [planId, setPlanId] = useState<number | ''>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | ''>('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<PlatformSubscriptionStatus | ''>('');
  const [onboardingFeePaid, setOnboardingFeePaid] = useState<boolean | ''>('');
  const [dateValue, setDateValue] = useState('');
  const [touched, setTouched] = useState(false);

  const dateField: SubscriptionDateField = resolveSubscriptionDateField(
    subscriptionStatus,
    singleSub?.status,
  );

  const filteredPlans = useMemo(() => {
    if (!accountType) return activePlans;
    return activePlans.filter((p) => p.type === accountType);
  }, [activePlans, accountType]);

  const isStorefront = accountType === 'storefront_buyer';

  const handleAccountTypeChange = (next: PlatformAccountType | '') => {
    setAccountType(next);
    if (next === 'storefront_buyer') {
      setPlanId('');
      setBillingCycle('');
      setSubscriptionStatus('');
      setOnboardingFeePaid('');
      setDateValue('');
      return;
    }
    if (next) {
      setPlanId((current) => {
        if (current === '') return current;
        return activePlans.some((p) => p.id === current && p.type === next) ? current : '';
      });
    }
  };

  const emailInvalid = email !== '' && !EMAIL_RE.test(email);
  const passwordTooShort = password !== '' && password.length < 8;
  const hasAnyChange =
    accountType !== '' || email !== '' || password !== '' || planId !== ''
    || billingCycle !== '' || subscriptionStatus !== '' || onboardingFeePaid !== ''
    || dateValue !== '';
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
    if (dateValue) payload[dateField] = dateValue;
    return payload;
  };

  const payload = buildPayload();
  const changeRows = buildPrivilegeChangeRows(payload, single, plans);

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;
    onConfirm(payload);
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

        {!isStorefront && (
          <>
            {!isBulk && singleSub && (
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-xs text-gray-600">
                Current: <span className="font-medium">{singleSub.plan_name ?? 'No plan'}</span> ·{' '}
                {singleSub.status} · {singleSub.onboarding_fee_paid ? 'onboarding paid' : 'onboarding unpaid'}
                {singleSub.next_billing_date ? ` · next billing ${new Date(singleSub.next_billing_date).toLocaleDateString()}` : ''}
              </div>
            )}

            {!isBulk && singleSub && subscriptionStatus === '' && dateField !== 'next_billing_date' && singleSub[dateField] && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700">
                The date below applies to the current status ({singleSub.status}): {DATE_FIELD_LABELS[dateField]}{' '}
                currently {new Date(singleSub[dateField] as string).toLocaleDateString()}. Pick a different status to edit that status' date instead.
              </div>
            )}
          </>
        )}

        <PipelineFormSection title="Account" icon={UserCog} description="Account type, email, and password override for this user.">
          <div>
            <PipelineIconField label="Account type" icon={UserCog}>
              <select
                value={accountType}
                onChange={(e) => handleAccountTypeChange(e.target.value as PlatformAccountType | '')}
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  placeholder="Set a new password for this account"
                  aria-invalid={passwordTooShort}
                  className={cn(
                    pipelineInputClass,
                    'pr-10',
                    passwordTooShort && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </PipelineIconField>
            {passwordTooShort && (
              <p className="mt-1 pl-10 text-xs text-red-600" role="alert">Password must be at least 8 characters.</p>
            )}
          </div>
        </PipelineFormSection>

        {!isStorefront && (
        <PipelineFormSection title="Subscription" icon={CreditCard} description="Plan, billing cycle, status, onboarding fee, and the status date.">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <PipelineIconField label="Plan" icon={CreditCard}>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : '')}
                disabled={isPending}
                className={pipelineSelectClass}
              >
                <option value="">Keep current plan</option>
                {filteredPlans.map((p) => (
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

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
            <PipelineIconField label={DATE_FIELD_LABELS[dateField]} icon={CalendarDays}>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                disabled={isPending}
                className={pipelineInputClass}
              />
            </PipelineIconField>
            <p className="mt-1 pl-10 text-xs text-gray-500">
              Applies to {DATE_FIELD_BY_STATUS[subscriptionStatus || singleSub?.status || 'active']} status —{' '}
              {subscriptionStatus ? `the status you selected (${subscriptionStatus})` : 'the current status'}.
            </p>
          </div>
        </PipelineFormSection>
        )}

        {changeRows.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Changes to apply
            </div>
            <ul className="divide-y divide-gray-100">
              {changeRows.map((row) => (
                <li key={row.label} className="flex items-start gap-2 px-3 py-2 text-xs">
                  <span className="w-32 shrink-0 text-gray-500">{row.label}</span>
                  <span className={cn('flex-1', row.sensitive && 'text-gray-400')}>
                    <span className="text-gray-800">{row.from}</span>
                    <span className="mx-1 text-gray-400">→</span>
                    <span className={cn('font-medium', row.sensitive ? 'text-gray-600' : 'text-gray-900')}>{row.to}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

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