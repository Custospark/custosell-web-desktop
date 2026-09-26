import { ReceiptText } from 'lucide-react';
import { canAccessModule, isBusinessOwner } from '../../shared/utils/moduleAccess';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useEfrisStatus } from '../settings/api/settings/EfrisQueries';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { FiscalCredentialList } from './ui/FiscalCredentialList';
import { EfrisTaxProfile } from './ui/EfrisTaxProfile';

/**
 * EFRIS app home (Phase 1 shell): live fiscal status for this deployment plus
 * the path to per-business credentials (Phase 2 vault). No credentials here.
 * Styled per docs/product/design-system.md (gray neutrals, shared Button).
 */
export default function EfrisOverviewPage() {
  const user = useAppSelector((s) => s.auth.user);
  const owner = isBusinessOwner(user);
  const canOpenTax = canAccessModule(user, 'settings');
  const { data: status, isLoading, isError } = useEfrisStatus();

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      <div className="mb-5 flex min-w-0 items-start gap-3 sm:gap-4 lg:mb-6">
        <div className="shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-md shadow-blue-500/20 sm:rounded-2xl sm:p-3">
          <ReceiptText className="h-5 w-5 text-white sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">EFRIS</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">
            Uganda fiscal receipts (URA) - live status for this deployment. Per-business
            credentials and stock reconciliation land in the next phases.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800">Deployment status</h2>
        {isLoading ? (
          <div className="mt-3">
            <LoadingSkeleton variant="minimal" message="Loading EFRIS status…" />
          </div>
        ) : isError || !status ? (
          <p className="mt-2 text-sm text-gray-500">Could not load EFRIS status.</p>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ['State', status.enabled ? 'Enabled' : 'Disabled'],
              ['Country', status.country || '-'],
              ['Environment', status.environment || '-'],
              ['Mode', status.mode || '-'],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
                <dd className="text-sm font-bold tabular-nums text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {status?.misconfigured && (
          <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs leading-relaxed text-amber-800">
            EFRIS is enabled but TIN/device/API credentials are incomplete. Sales still
            succeed; fiscalization stays failed until the backend is configured.
          </p>
        )}
      </div>

      <div className="mt-5">
        <EfrisTaxProfile />
      </div>

      <div className="mt-5 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800">What fiscalizes</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-500">
          POS sales and sent sales invoices queue fiscal payloads automatically - checkout
          is never blocked. Failed items retry in the background.
        </p>
        <div className="mt-4">
          <p className="text-xs text-gray-500">
            {canOpenTax
              ? 'The full tax workspace, including VAT workbooks, lives under Settings → Tax.'
              : 'Tax settings stay with your administrator - everything you need is on this page.'}
          </p>
        </div>
      </div>

      {owner && (
        <div className="mt-5">
          <FiscalCredentialList />
        </div>
      )}
    </div>
  );
}
