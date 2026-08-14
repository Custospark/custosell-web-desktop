import { Percent, ToggleLeft } from 'lucide-react';
import { PipelineFormSection, PipelineIconField } from '../pipeline/ui/pipelineFormFields';

interface Props {
  commissionRate: string;
  discountRate: string;
  commissionType: 'percentage' | 'flat';
  isActive: boolean;
  onChange: (patch: Partial<{
    commission_rate: string;
    discount_rate: string;
    commission_type: 'percentage' | 'flat';
    is_active: boolean;
  }>) => void;
}

export function SalesRepCommissionSection({ commissionRate, discountRate, commissionType, isActive, onChange }: Props) {
  const percentage = commissionType === 'percentage';

  return (
    <PipelineFormSection title="Commission" icon={Percent} description="How this sales rep earns on referrals">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PipelineIconField label="Commission Rate" icon={Percent} required>
          <input
            type="number"
            step="0.01"
            value={commissionRate}
            onChange={(e) => onChange({ commission_rate: e.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={percentage ? 'e.g. 10' : 'e.g. 50000'}
          />
        </PipelineIconField>
        <PipelineIconField label="Referee Discount" icon={Percent} required>
          <input
            type="number"
            step="0.01"
            value={discountRate}
            onChange={(e) => onChange({ discount_rate: e.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="e.g. 20"
          />
        </PipelineIconField>
        <PipelineIconField label="Type" icon={ToggleLeft}>
          <select
            value={commissionType}
            onChange={(e) => onChange({ commission_type: e.target.value as 'percentage' | 'flat' })}
            className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="flat">Flat</option>
          </select>
        </PipelineIconField>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="is-active"
            checked={isActive}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="is-active" className="text-sm text-gray-700">Active (rep can generate referrals)</label>
        </div>
      </div>
      {percentage && <SafetyHint discountRate={discountRate} commissionRate={commissionRate} />}
    </PipelineFormSection>
  );
}

function SafetyHint({ discountRate, commissionRate }: { discountRate: string; commissionRate: string }) {
  const discount = Number(discountRate || 0);
  const commission = Number(commissionRate || 0);
  const minCommission = discount >= 100 ? 0 : (discount / (100 - discount)) * 100;
  const ok = discount > 0 && discount <= 30 && commission > minCommission && commission < 50;

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${ok ? 'border-indigo-100 bg-indigo-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
      <p className={`text-xs font-semibold ${ok ? 'text-indigo-700' : 'text-amber-700'}`}>
        {ok ? 'How this code splits' : 'This split breaks the rule - company must earn the most'}
      </p>
      <p className="mt-0.5 text-xs text-indigo-600">
        {ok ? (
          <>
            Referee saves <span className="font-semibold">{discount}%</span> · Referrer earns{' '}
            <span className="font-semibold">{commission}%</span> of what&apos;s paid · Company keeps the rest.
          </>
        ) : (
          <>
            Commission must be below 50% and above {minCommission.toFixed(1)}% for a {discount}% referee discount (keep the company the largest earner).
          </>
        )}
      </p>
    </div>
  );
}