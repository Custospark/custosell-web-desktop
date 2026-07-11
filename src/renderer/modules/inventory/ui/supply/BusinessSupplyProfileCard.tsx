import { useEffect, useState } from 'react';
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

  const [open, setOpen] = useState(false);
  const [headline, setHeadline] = useState('');

  useEffect(() => {
    if (!business) return;
    setOpen(Boolean(business.is_open_for_supply));
    setHeadline(business.supply_headline ?? '');
  }, [business]);

  if (isLoading || !business) return null;

  const dirty =
    open !== Boolean(business.is_open_for_supply)
    || headline !== (business.supply_headline ?? '');

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Store className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Supply marketplace</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            When open, other businesses can browse products you list for supply. Purchase orders stay online-only.
          </p>
        </div>
      </div>

      {isOffline ? (
        <div className="mb-4">
          <SupplyOfflineBanner />
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={open}
          disabled={isOffline || updateProfile.isPending}
          onChange={(e) => setOpen(e.target.checked)}
          className="rounded border-gray-300 text-blue-600"
        />
        Open this business for supply
      </label>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="supply_headline">
          Marketplace headline (optional)
        </label>
        <input
          id="supply_headline"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          value={headline}
          disabled={isOffline || updateProfile.isPending}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Wholesale groceries, next-day delivery"
          maxLength={255}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          disabled={isOffline || !dirty || updateProfile.isPending}
          loading={updateProfile.isPending}
          onClick={() => {
            updateProfile.mutate({
              is_open_for_supply: open,
              supply_headline: headline.trim() || null,
            });
          }}
        >
          Save supply profile
        </Button>
      </div>
    </section>
  );
}
