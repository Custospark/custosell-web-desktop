import { Link } from 'react-router-dom';
import { Scale, ArrowRight } from 'lucide-react';
import { useBusinessTaxSettings } from '../settings/hooks/useBusinessTaxSettings';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import type { DashboardSummary } from './DashboardTypes';

interface DashboardVatSectionProps {
  summary?: DashboardSummary;
  isLoading?: boolean;
}

export default function DashboardVatSection({ summary, isLoading }: DashboardVatSectionProps) {
  const { taxEnabled, business, isLoading: businessLoading } = useBusinessTaxSettings();
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const currency = business?.currency || 'UGX';
  const vat = summary?.today_vat;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Scale className="w-4 h-4 text-violet-500 shrink-0" />
            VAT today
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Tax reporting is separate from net sales (cash collected).
          </p>
        </div>
        {taxEnabled && (
          <Link
            to={ROUTES.SETTINGS.TAX}
            className="text-xs font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1 shrink-0"
          >
            Full workbook
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {businessLoading ? (
        <LoadingSkeleton variant="minimal" message="Loading tax settings…" />
      ) : !taxEnabled ? (
        <p
          className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
          title={isOffline ? 'Unavailable offline' : undefined}
        >
          {isOffline ? (
            'Enable VAT registration under Business settings to track output VAT on sales.'
          ) : (
            <>
              Enable VAT registration under{' '}
              <Link to={ROUTES.SETTINGS.BUSINESS} className="font-medium underline">
                Business settings
              </Link>{' '}
              to track output VAT on sales.
            </>
          )}
        </p>
      ) : isLoading ? (
        <LoadingSkeleton variant="minimal" />
      ) : vat ? (
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5">
            <dt className="text-xs text-gray-500">Net output VAT</dt>
            <dd className="text-base font-bold text-gray-900 tabular-nums mt-0.5">
              {formatCurrency(vat.net_output_vat, currency)}
            </dd>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5">
            <dt className="text-xs text-gray-500">Input VAT (claimable)</dt>
            <dd className="text-base font-bold text-gray-900 tabular-nums mt-0.5">
              {formatCurrency(vat.input_vat, currency)}
            </dd>
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2.5">
            <dt className="text-xs text-violet-700">Estimated VAT payable</dt>
            <dd className="text-base font-bold text-violet-800 tabular-nums mt-0.5">
              {formatCurrency(vat.vat_payable, currency)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-gray-500">No VAT activity recorded today.</p>
      )}

      {taxEnabled && vat && !isLoading && (
        <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
          {vat.transaction_count} taxable sale{vat.transaction_count === 1 ? '' : 's'} today
          {vat.output_vat_refunded > 0 && (
            <> · Output VAT refunded {formatCurrency(vat.output_vat_refunded, currency)}</>
          )}
        </p>
      )}
    </div>
  );
}
