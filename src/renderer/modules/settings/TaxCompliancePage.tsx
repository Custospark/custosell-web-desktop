import { useMemo, useState } from 'react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { Button } from '../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { useReportDownload } from '../dashboard/DashboardQueries';
import { useBusinessTaxSettings } from './hooks/useBusinessTaxSettings';
import { useVatSummary, type VatInputExpenseRow } from './api/settings/TaxQueries';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { TAX_REGIME_LABELS } from '../../shared/utils/taxEngine';
import { getFilingAuthorityLabel, getJurisdictionLabel } from '../../shared/utils/taxJurisdictions';
import {
  REPORT_DATE_PRESETS,
  isValidDateRange,
  resolveReportDateRange,
  type ReportDatePreset,
} from '../../shared/utils/reportDatePresets';
import { cn } from '../../shared/utils/cn';
import {
  Scale,
  WifiOff,
  FileText,
  Download,
  Globe,
  Tag,
  Building2,
  Hash,
  Receipt,
  Landmark,
} from 'lucide-react';

function TaxProfileField({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3', className)}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-2 flex items-start gap-2 text-sm font-medium text-gray-900">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white">
          {icon}
        </span>
        <span className="min-w-0 break-words whitespace-pre-line self-center">{children}</span>
      </dd>
    </div>
  );
}

export default function TaxCompliancePage() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { business, taxEnabled, isLoading: businessLoading } = useBusinessTaxSettings();
  const currency = business?.currency || 'UGX';
  const [preset, setPreset] = useState<ReportDatePreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const range = resolveReportDateRange(preset, customFrom, customTo);
  const { data, isLoading, isError } = useVatSummary(preset, customFrom, customTo, taxEnabled);
  const downloadReport = useReportDownload();

  const jurisdictionCode = business?.jurisdiction ?? 'UG';
  const jurisdictionLabel = getJurisdictionLabel(jurisdictionCode);
  const filingAuthority = getFilingAuthorityLabel(jurisdictionCode);
  const hasNamedFilingAuthority = filingAuthority !== 'your tax authority';
  const taxRegime = (business?.tax_regime as 'none' | 'vat_registered') ?? 'none';
  const vatRate = business?.default_vat_rate != null ? Number(business.default_vat_rate) : 18;

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Net output VAT', value: data.net_output_vat },
      { label: 'Input VAT (claimable)', value: data.input_vat },
      { label: 'Estimated VAT payable', value: data.vat_payable, highlight: true },
      { label: 'Taxable sales (net)', value: data.taxable_sales_net },
    ];
  }, [data]);

  const handleDownload = (format: 'pdf' | 'csv' | 'xlsx') => {
    if (!isValidDateRange(range.dateFrom, range.dateTo) || isOffline) return;
    const params = new URLSearchParams({
      format,
      date_from: range.dateFrom,
      date_to: range.dateTo,
    });
    const ext = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv';
    downloadReport('/reports/vat-summary', params, `vat-summary-report.${ext}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600 shrink-0">
          <Scale className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Settings</p>
          <h1 className="text-2xl font-bold text-gray-900">Tax &amp; VAT Compliance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Prepare VAT return workbooks from sales and claimable purchase VAT for your jurisdiction.
          </p>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Tax reports require an internet connection.</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Business tax profile</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {businessLoading ? (
            <LoadingSkeleton variant="minimal" message="Loading tax profile…" />
          ) : !taxEnabled ? (
            <p
              className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
              title={isOffline ? 'Unavailable offline' : undefined}
            >
              Enable VAT registration under Settings → Business to calculate output VAT on sales.
            </p>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <TaxProfileField label="Jurisdiction" icon={<Globe className="h-4 w-4 text-blue-600" />}>
                {jurisdictionLabel === 'Not set' ? '—' : jurisdictionLabel}
              </TaxProfileField>
              <TaxProfileField label="TIN / Tax ID" icon={<Tag className="h-4 w-4 text-blue-600" />}>
                {business?.tax_id || '—'}
              </TaxProfileField>
              <TaxProfileField label="Tax regime" icon={<Receipt className="h-4 w-4 text-blue-600" />}>
                {TAX_REGIME_LABELS[taxRegime]}
              </TaxProfileField>
              <TaxProfileField label="Filing authority" icon={<Landmark className="h-4 w-4 text-blue-600" />}>
                {hasNamedFilingAuthority ? filingAuthority : '—'}
              </TaxProfileField>
              <TaxProfileField label="Default VAT rate" icon={<Hash className="h-4 w-4 text-blue-600" />}>
                {vatRate.toFixed(2)}%
              </TaxProfileField>
              <TaxProfileField label="Prices include VAT" icon={<Receipt className="h-4 w-4 text-blue-600" />}>
                {business?.prices_include_tax !== false ? 'Yes' : 'No'}
              </TaxProfileField>
            </dl>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 shrink-0">
            <Scale className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">VAT summary</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Period</label>
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={preset}
                onChange={(e) => setPreset(e.target.value as ReportDatePreset)}
              >
                {REPORT_DATE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            {preset === 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">From</label>
                  <input type="date" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">To</label>
                  <input type="date" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" disabled={isOffline} onClick={() => handleDownload('pdf')}>
                <FileText className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" disabled={isOffline} onClick={() => handleDownload('csv')}>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>

          {isLoading && <LoadingSkeleton variant="card" />}
          {isError && <p className="text-sm text-red-600">Could not load VAT summary for this period.</p>}
          {!taxEnabled && !isLoading && (
            <p
              className="text-sm text-gray-500"
              title={isOffline ? 'Unavailable offline' : undefined}
            >
              VAT summary figures require VAT registration. Enable it above to track output VAT from sales and claimable purchase VAT.
            </p>
          )}

          {data && !isLoading && taxEnabled && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map((card) => (
                  <div
                    key={card.label}
                    className={`rounded-lg border p-4 ${card.highlight ? 'border-violet-200 bg-violet-50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className={`text-lg font-bold mt-1 ${card.highlight ? 'text-violet-700' : 'text-gray-900'}`}>
                      {formatCurrency(card.value, currency)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-500">
                {data.transaction_count} sales in period · Exempt sales {formatCurrency(data.exempt_sales_net, currency)} ·
                Zero-rated {formatCurrency(data.zero_rated_sales_net, currency)}
              </div>

              {data.input_vat_expenses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Claimable input VAT</h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Supplier TIN</th>
                          <th className="px-3 py-2 text-right">VAT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.input_vat_expenses.map((row: VatInputExpenseRow, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2 whitespace-nowrap">{row.date}</td>
                            <td className="px-3 py-2">{row.description}</td>
                            <td className="px-3 py-2">{row.supplier_tin || '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.vat_amount, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                {hasNamedFilingAuthority
                  ? `This is a filing workbook only — submit your return through the ${filingAuthority} web portal.`
                  : 'This is a filing workbook only — submit your return through your tax authority\'s web portal.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
