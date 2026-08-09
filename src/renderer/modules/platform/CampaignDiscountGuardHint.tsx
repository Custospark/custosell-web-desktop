import { ShieldAlert, ShieldCheck } from 'lucide-react';

export const CAMPAIGN_MAX_PERCENTAGE_DISCOUNT = 30;
export const CAMPAIGN_MAX_FLAT_DISCOUNT_USD = 20;

interface Props {
  discountType: string;
  discountValue: string;
  discountDurationMonths: string;
}

export function CampaignDiscountGuardHint({ discountType, discountValue, discountDurationMonths }: Props) {
  const value = Number(discountValue || 0);
  const duration = Number(discountDurationMonths || 1);

  const percentageBreak = discountType === 'percentage' && value > CAMPAIGN_MAX_PERCENTAGE_DISCOUNT;
  const flatBreak = discountType === 'flat_amount' && value >= CAMPAIGN_MAX_FLAT_DISCOUNT_USD;
  const durationBreak = duration > 1;

  const breaks = percentageBreak || flatBreak || durationBreak;

  return (
    <div className={`mt-4 rounded-lg border px-3 py-2.5 ${breaks ? 'border-amber-200 bg-amber-50/60' : 'border-indigo-100 bg-indigo-50/60'}`}>
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${breaks ? 'text-amber-700' : 'text-indigo-700'}`}>
        {breaks ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        {breaks ? 'This code breaks the rule — company must keep the most' : 'How this code splits'}
      </p>
      {breaks ? (
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-700">
          {percentageBreak && <li>Percentage discounts are capped at {CAMPAIGN_MAX_PERCENTAGE_DISCOUNT}%.</li>}
          {flatBreak && <li>Flat discounts must stay below ${CAMPAIGN_MAX_FLAT_DISCOUNT_USD} (half the cheapest plan fee).</li>}
          {durationBreak && <li>Campaign codes are single-period — the discount lasts 1 month.</li>}
        </ul>
      ) : (
        <p className="mt-0.5 text-xs text-indigo-600">
          {discountType === 'free_month' ? (
            <>Referee gets a full billing period free — the company covers the first charge.</>
          ) : (
            <>
              Referee saves {discountType === 'flat_amount' ? `$${value || 0}` : `${value || 0}%`} · discount-only, no reward.
            </>
          )}
        </p>
      )}
    </div>
  );
}