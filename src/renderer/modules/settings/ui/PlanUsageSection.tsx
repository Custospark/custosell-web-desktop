import { useMemo } from 'react';
import { Gauge, Infinity as InfinityIcon } from 'lucide-react';
import { useStaff } from '../api/settings/StaffQueries';
import { useLocations } from '../api/settings/LocationQueries';
import { useProducts } from '../../inventory/api/products/ProductQueries';
import { usePipelineBoards } from '../../pipeline/api/usePipelineBoardQueries';
import { BudgetProgressBar } from '../../estimates/ui/estimatesShared';
import type { Plan } from '../../../shared/types';

interface PlanUsageSectionProps {
  plan: Plan | null;
}

interface UsageItem {
  key: string;
  label: string;
  used: number;
  limit: number | null;
}

function UnlimitedRow({ label, used }: { label: string; used: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="tabular-nums text-gray-600">
          {used} <span className="text-gray-400">/</span>{' '}
          <span className="inline-flex items-center gap-1 text-gray-400">
            <InfinityIcon className="w-3 h-3" /> Unlimited
          </span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full w-full rounded-full bg-blue-200" />
      </div>
    </div>
  );
}

export default function PlanUsageSection({ plan }: PlanUsageSectionProps) {
  const { data: staff } = useStaff();
  const { data: locations } = useLocations();
  const { data: products } = useProducts();
  const { data: boards } = usePipelineBoards({ salesOnly: false, poll: false });

  const boardMembersUsed = useMemo(
    () => new Set((boards ?? []).flatMap((b) => (b.members ?? []).map((m) => m.id ?? ''))).size,
    [boards],
  );

  const items = useMemo<UsageItem[]>(() => {
    if (!plan) return [];
    const limits = plan.limits ?? {};
    const staffUsed = (staff ?? []).filter(Boolean).length;
    const productsUsed = (products ?? []).length;
    const locationsUsed = (locations ?? []).filter(Boolean).length;

    return [
      { key: 'max_staff', label: 'Staff accounts', used: staffUsed, limit: limits.max_staff ?? null },
      { key: 'max_products', label: 'Products', used: productsUsed, limit: limits.max_products ?? null },
      { key: 'max_businesses', label: 'Business locations (branches)', used: locationsUsed, limit: limits.max_businesses ?? null },
      { key: 'max_board_members', label: 'Board members', used: boardMembersUsed, limit: limits.max_board_members ?? null },
    ];
  }, [plan, staff, locations, products, boardMembersUsed]);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Gauge className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-800">Plan usage</h3>
      </div>
      <div className="space-y-4">
        {items.map((item) =>
          item.limit == null ? (
            <UnlimitedRow key={item.key} label={item.label} used={item.used} />
          ) : (
            <BudgetProgressBar
              key={item.key}
              label={item.label}
              actual={item.used}
              budget={item.limit}
              formatValue={(n) => String(n)}
            />
          ),
        )}
      </div>
    </div>
  );
}