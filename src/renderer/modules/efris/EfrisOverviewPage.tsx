import { Link } from 'react-router-dom';
import { ReceiptText, Settings } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { useEfrisStatus } from '../settings/api/settings/EfrisQueries';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';

/**
 * EFRIS app home (Phase 1 shell): live fiscal status for this deployment plus
 * the path to per-business credentials (Phase 2 vault). No credentials here.
 */
export default function EfrisOverviewPage() {
  const { data: status, isLoading, isError } = useEfrisStatus();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="shrink-0 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 p-2.5 shadow-md shadow-teal-500/20 sm:rounded-2xl sm:p-3">
          <ReceiptText className="h-5 w-5 text-white sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">EFRIS</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Uganda fiscal receipts (URA) - live status for this deployment. Per-business
            credentials and stock reconciliation land in the next phases.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">Deployment status</h2>
        {isLoading ? (
          <div className="mt-3">
            <LoadingSkeleton variant="minimal" message="Loading EFRIS status…" />
          </div>
        ) : isError || !status ? (
          <p className="mt-2 text-sm text-gray-600">Could not load EFRIS status.</p>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ['State', status.enabled ? 'Enabled' : 'Disabled'],
              ['Country', status.country || '-'],
              ['Environment', status.environment || '-'],
              ['Mode', status.mode || '-'],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="text-sm font-bold tabular-nums text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {status?.misconfigured && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            EFRIS is enabled but TIN/device/API credentials are incomplete. Sales still
            succeed; fiscalization stays failed until the backend is configured.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">What fiscalizes</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          POS sales and sent sales invoices queue fiscal payloads automatically - checkout
          is never blocked. Failed items retry in the background.
        </p>
        <Link
          to={ROUTES.SETTINGS.TAX}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
        >
          <Settings className="h-4 w-4" aria-hidden />
          Open Tax settings
        </Link>
      </div>
    </div>
  );
}
