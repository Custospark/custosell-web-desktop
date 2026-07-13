import { useState } from 'react';
import { Store } from 'lucide-react';
import { Button } from '../../../../shared/components/buttons/Button';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import {
  useBusiness,
  useUpdateSupplyProfile,
} from '../../../settings/api/settings/BusinessQueries';
import { SupplyOfflineBanner } from './SupplyOfflineBanner';

/** Business-level master switch for B2B marketplace visibility. */
export function BusinessSupplyProfileCard() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { data: business, isLoading } = useBusiness();
  const updateProfile = useUpdateSupplyProfile();

  const [draft, setDraft] = useState<{ open: boolean; headline: string } | null>(null);

  if (isLoading || !business) return null;

  const open = draft?.open ?? Boolean(business.is_open_for_supply);
  const headline = draft?.headline ?? (business.supply_headline ?? '');
  const dirty =
    open !== Boolean(business.is_open_for_supply)
    || headline !== (business.supply_headline ?? '');

  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Store className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">Supply marketplace</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-gray-600">
            When open, other businesses can browse products you list for supply. Purchase orders stay online-only.
          </p>
        </div>
      </div>

      {isOffline ? (
        <div className="mb-4 min-w-0">
          <SupplyOfflineBanner />
        </div>
      ) : null}

      <label className="flex min-w-0 items-start gap-2.5 text-sm text-gray-800 sm:items-center">
        <input
          type="checkbox"
          checked={open}
          disabled={isOffline || updateProfile.isPending}
          onChange={(e) => setDraft({ open: e.target.checked, headline })}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 sm:mt-0"
        />
        <span className="min-w-0 leading-snug">Open this business for supply</span>
      </label>

      <div className="mt-4 min-w-0">
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="supply_headline">
          Marketplace headline (optional)
        </label>
        <input
          id="supply_headline"
          className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          value={headline}
          disabled={isOffline || updateProfile.isPending}
          onChange={(e) => setDraft({ open, headline: e.target.value })}
          placeholder="e.g. Wholesale groceries, next-day delivery"
          maxLength={255}
        />
      </div>

      <div className="mt-auto flex pt-4 sm:justify-end">
        <Button
          type="button"
          disabled={isOffline || !dirty || updateProfile.isPending}
          loading={updateProfile.isPending}
          className="w-full sm:w-auto"
          onClick={() => {
            updateProfile.mutate(
              {
                is_open_for_supply: open,
                supply_headline: headline.trim() || null,
              },
              {
                onSuccess: () => setDraft(null),
              },
            );
          }}
        >
          Save supply profile
        </Button>
      </div>
    </section>
  );
}
