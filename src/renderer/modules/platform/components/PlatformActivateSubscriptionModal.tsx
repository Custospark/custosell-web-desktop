import { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Zap, CalendarClock, CalendarDays, CreditCard } from 'lucide-react';
import type { PlatformBusiness } from '../api/PlatformTypes';
import { usePlans } from '../api/PlanQueries';
import { PipelineModalHero, PipelineFormSection, pipelineLabelClass, pipelineSelectClass } from '../../pipeline/ui/pipelineFormFields';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

type BillingCycle = 'monthly' | 'yearly';

interface PlatformActivateSubscriptionModalProps {
  open: boolean;
  business: PlatformBusiness | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (planId: number, billingCycle: BillingCycle) => void;
}

export function PlatformActivateSubscriptionModal({
  open,
  business,
  isPending,
  onClose,
  onConfirm,
}: PlatformActivateSubscriptionModalProps) {
  const { data: plans, isLoading: plansLoading } = usePlans();
  const [planId, setPlanId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const activePlans = useMemo(() => (plans ?? []).filter((p) => p.is_active), [plans]);
  const selectedPlan = useMemo(() => activePlans.find((p) => p.id === Number(planId)) ?? null, [activePlans, planId]);

  const price = selectedPlan
    ? billingCycle === 'yearly'
      ? (selectedPlan.price_yearly_usd ?? selectedPlan.price_monthly_usd)
      : selectedPlan.price_monthly_usd
    : null;

  const canSubmit = planId !== '' && !isPending;

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit || !planId) return;
    onConfirm(Number(planId), billingCycle);
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Activate Subscription"
      subtitle={business ? `Manually activate a plan for ${business.name}` : 'Activate a plan'}
      size="md"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Zap}
          tone="emerald"
          title="Start a paid subscription"
          description="Runs the normal onboarding flow: subscribe, then activate so the plan becomes effective for the business."
        />

        <PipelineFormSection title="Plan" icon={CreditCard} description="Choose the plan the business will be put on.">
          {plansLoading ? (
            <LoadingSkeleton variant="table" />
          ) : (
            <div>
              <label className={pipelineLabelClass}>Plan</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                disabled={isPending}
                className={pipelineSelectClass}
              >
                <option value="">Select a plan...</option>
                {activePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ${Number(p.price_monthly_usd ?? 0).toFixed(2)}/mo
                  </option>
                ))}
              </select>
              {selectedPlan && (
                <p className="mt-1.5 text-xs text-gray-500">
                  {selectedPlan.description ?? 'This plan applies immediately after activation.'}
                  {Number(selectedPlan.onboarding_fee_usd ?? 0) > 0
                    ? ` · ${formatCurrency(selectedPlan.onboarding_fee_usd ?? 0, 'USD')} onboarding fee`
                    : ''}
                </p>
              )}
            </div>
          )}
        </PipelineFormSection>

        <PipelineFormSection title="Billing cycle" icon={CalendarDays} description="Monthly or yearly billing for the new subscription.">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              disabled={isPending}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                billingCycle === 'monthly'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              } disabled:opacity-50`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                <CalendarClock className="h-4 w-4 text-gray-400" /> Monthly
              </span>
              <span className="text-xs text-gray-500">
                ${Number(selectedPlan?.price_monthly_usd ?? 0).toFixed(2)}/mo
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              disabled={isPending}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                billingCycle === 'yearly'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              } disabled:opacity-50`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                <CalendarDays className="h-4 w-4 text-gray-400" /> Yearly
              </span>
              <span className="text-xs text-gray-500">
                ${Number(selectedPlan?.price_yearly_usd ?? 0).toFixed(2)}/yr
              </span>
            </button>
          </div>
          {price !== null && price > 0 && (
            <p className="text-xs text-gray-500">
              {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} price: {formatCurrency(price, 'USD')}
            </p>
          )}
        </PipelineFormSection>

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
            <Zap className="h-4 w-4" />
            {isPending ? 'Activating...' : 'Activate Subscription'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
