import { useCallback, useMemo, useState } from 'react';
import {
  CreditCard, Info, Coins, DollarSign, Clock, CheckSquare, Sliders, ToggleLeft,
} from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { inputClass, selectClass, labelClass } from '../../../shared/utils/inputStyles';

const FEATURES = {
  sales: 'Point of Sale', inventory: 'Inventory', customers: 'Customers',
  expenses: 'Expenses', dashboard: 'Dashboard',
  pipeline: 'Pipeline', estimates: 'Estimates & Projects', storefront: 'Storefront',
  marketplace: 'Marketplace', documents: 'Documents', accounting: 'Accounting',
  hr: 'HR & Payroll', forecasting: 'Forecasting & Budgets',
};

const LIMIT_KEYS = ['max_staff', 'max_products', 'max_businesses'];
const LIMIT_LABELS: Record<string, string> = {
  max_staff: 'Max Staff', max_products: 'Max Products', max_businesses: 'Max Businesses',
};

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

function FormSection({ icon: Icon, title, children }: SectionProps) {
  return (
    <fieldset className="border border-gray-200 rounded-lg p-4">
      <legend className="flex items-center gap-1.5 px-2 text-sm font-semibold text-gray-700">
        <Icon className="w-4 h-4 text-gray-400" />
        {title}
      </legend>
      <div className="space-y-3 mt-1">
        {children}
      </div>
    </fieldset>
  );
}

interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  plan?: Plan | null;
}

export function PlanFormModal({ open, onClose, plan }: PlanFormModalProps) {
  const isEditing = !!plan;
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [name, setName] = useState(plan?.name ?? '');
  const [slug, setSlug] = useState(plan?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState(plan?.description ?? '');
  const [priceMonthly, setPriceMonthly] = useState(plan ? Number(plan.price_monthly) : 0);
  const [priceYearly, setPriceYearly] = useState(plan?.price_yearly ? Number(plan.price_yearly) : null);
  const [priceMonthlyUsd, setPriceMonthlyUsd] = useState(plan?.price_monthly_usd ? Number(plan.price_monthly_usd) : null);
  const [priceYearlyUsd, setPriceYearlyUsd] = useState(plan?.price_yearly_usd ? Number(plan.price_yearly_usd) : null);
  const [onboardingFeeUgx, setOnboardingFeeUgx] = useState(plan?.onboarding_fee_ugx ?? null);
  const [onboardingFeeUsd, setOnboardingFeeUsd] = useState(plan?.onboarding_fee_usd ?? null);
  const [trialDays, setTrialDays] = useState<number | null>(plan?.trial_days ?? 14);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'both'>(plan?.billing_cycle ?? 'monthly');
  const [features, setFeatures] = useState<Record<string, boolean>>(plan?.features ?? {});
  const [limits, setLimits] = useState<Record<string, number | null>>(plan?.limits ?? {});
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);
  const [isPopular, setIsPopular] = useState(plan?.is_popular ?? false);
  const [sortOrder, setSortOrder] = useState(plan?.sort_order ?? 0);

  const handleNameChange = useCallback((val: string) => {
    setName(val);
    if (!slugTouched && !isEditing) {
      setSlug(toSlug(val));
    }
  }, [slugTouched, isEditing]);

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && slug.trim().length > 0 && priceMonthly >= 0;
  }, [name, slug, priceMonthly]);

  const toggleFeature = useCallback((key: string) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateLimit = useCallback((key: string, value: string) => {
    const num = value === '' ? null : Number(value);
    setLimits((prev) => ({ ...prev, [key]: num }));
  }, []);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: PlanFormPayload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description || null,
      price_monthly: priceMonthly,
      price_yearly: priceYearly,
      price_monthly_usd: priceMonthlyUsd,
      price_yearly_usd: priceYearlyUsd,
      onboarding_fee_ugx: onboardingFeeUgx,
      onboarding_fee_usd: onboardingFeeUsd,
      trial_days: trialDays,
      billing_cycle: billingCycle,
      features,
      limits,
      is_active: isActive,
      is_popular: isPopular,
      sort_order: sortOrder,
    };
    if (isEditing && plan) {
      updateMutation.mutate({ id: plan.id, ...payload }, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEditing ? `Edit ${plan?.name}` : 'Add plan'}
      subtitle={isEditing ? 'Modify plan details, pricing, features, and limits' : 'Create a new subscription plan'}
      size="2xl"
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">

        <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
          <div className="p-2 rounded-full bg-indigo-100 shrink-0">
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-indigo-900">{isEditing ? `Editing ${plan?.name}` : 'New subscription plan'}</h3>
            <p className="text-xs text-indigo-700 mt-0.5">
              {isEditing ? 'Update pricing, features, and availability for this plan.' : 'Define pricing, features, usage limits, and availability for a new plan.'}
            </p>
          </div>
        </div>

        <FormSection icon={Info} title="Basic info">
          <div>
            <label className={labelClass}>Plan name</label>
            <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Essential" className={inputClass} disabled={isSubmitting} />
          </div>
          <div>
            <label className={labelClass}>Slug</label>
            <input type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="e.g. essential" className={inputClass} disabled={isSubmitting} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this plan" className={`${inputClass} resize-y min-h-[60px]`} disabled={isSubmitting} />
          </div>
        </FormSection>

        <FormSection icon={Coins} title="Pricing (UGX)">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Monthly price (UGX) *</label>
              <input type="number" min={0} value={priceMonthly} onChange={(e) => setPriceMonthly(Number(e.target.value))} className={inputClass} disabled={isSubmitting} />
            </div>
            <div>
              <label className={labelClass}>Yearly price (UGX)</label>
              <input type="number" min={0} value={priceYearly ?? ''} onChange={(e) => setPriceYearly(e.target.value ? Number(e.target.value) : null)} className={inputClass} disabled={isSubmitting} />
            </div>
          </div>
        </FormSection>

        <FormSection icon={DollarSign} title="Pricing (USD)">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Monthly price (USD)</label>
              <input type="number" min={0} step="0.01" value={priceMonthlyUsd ?? ''} onChange={(e) => setPriceMonthlyUsd(e.target.value ? Number(e.target.value) : null)} className={inputClass} disabled={isSubmitting} />
            </div>
            <div>
              <label className={labelClass}>Yearly price (USD)</label>
              <input type="number" min={0} step="0.01" value={priceYearlyUsd ?? ''} onChange={(e) => setPriceYearlyUsd(e.target.value ? Number(e.target.value) : null)} className={inputClass} disabled={isSubmitting} />
            </div>
          </div>
        </FormSection>

        <FormSection icon={Clock} title="Fees & billing">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Onboarding fee (UGX)</label>
              <input type="number" min={0} value={onboardingFeeUgx ?? ''} onChange={(e) => setOnboardingFeeUgx(e.target.value ? Number(e.target.value) : null)} className={inputClass} disabled={isSubmitting} />
            </div>
            <div>
              <label className={labelClass}>Onboarding fee (USD)</label>
              <input type="number" min={0} step="0.01" value={onboardingFeeUsd ?? ''} onChange={(e) => setOnboardingFeeUsd(e.target.value ? Number(e.target.value) : null)} className={inputClass} disabled={isSubmitting} />
            </div>
            <div>
              <label className={labelClass}>Trial days</label>
              <input type="number" min={0} max={365} value={trialDays ?? ''} onChange={(e) => setTrialDays(e.target.value ? Number(e.target.value) : null)} className={inputClass} disabled={isSubmitting} />
            </div>
            <div>
              <label className={labelClass}>Billing cycle</label>
              <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly' | 'both')} className={selectClass} disabled={isSubmitting}>
                <option value="monthly">Monthly only</option>
                <option value="yearly">Yearly only</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
        </FormSection>

        <FormSection icon={CheckSquare} title="Features">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FEATURES).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={!!features[key]} onChange={() => toggleFeature(key)} disabled={isSubmitting} className="rounded border-gray-300" />
                {label}
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection icon={Sliders} title="Limits">
          <div className="grid grid-cols-2 gap-3">
            {LIMIT_KEYS.map((key) => (
              <div key={key}>
                <label className={labelClass}>{LIMIT_LABELS[key]}</label>
                <input
                  type="number"
                  min={0}
                  value={limits[key] ?? ''}
                  onChange={(e) => updateLimit(key, e.target.value)}
                  placeholder="Unlimited"
                  className={inputClass}
                  disabled={isSubmitting}
                />
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection icon={ToggleLeft} title="Status & ordering">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={isSubmitting} className="rounded border-gray-300" />
              Active (visible to users)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} disabled={isSubmitting} className="rounded border-gray-300" />
              Mark as popular
            </label>
          </div>
          <div className="mt-3">
            <label className={labelClass}>Sort order</label>
            <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className={`${inputClass} w-32`} disabled={isSubmitting} />
          </div>
        </FormSection>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
            {isEditing ? 'Save changes' : 'Create plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}