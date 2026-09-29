import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Download, Minus, Pencil, Plus } from 'lucide-react';
import { CURRENCIES } from '../../shared/utils/currencies';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { axiosInstance } from '../../app/api/axiosConfig';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { QUOTATIONS } from '../../shared/api/endpoints/endpoints';
import { Button } from '../../shared/components/buttons/Button';
import { LineIcon, NumberField } from './investmentBudgetParts';
import { fmtUgx } from './investmentBudgetData';
import type { CatalogItem, QuotePackage, QuoteTotals } from './investmentBudgetParts';

export default function InvestmentBudgetPage() {
  const [plan, setPlan] = useState('essential');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [tills, setTills] = useState(1);
  const [staff, setStaff] = useState(3);
  const [branches, setBranches] = useState(1);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [currency, setCurrency] = useState('UGX');
  const [discount, setDiscount] = useState(0);
  const [vat, setVat] = useState(0);
  const [customer, setCustomer] = useState('');
  const [repName, setRepName] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [customLines, setCustomLines] = useState<{ label: string; amount: string }[]>([]);
  const [downloading, setDownloading] = useState(false);

  const packagesQuery = useQuery({
    queryKey: ['quotations', 'packages', currency],
    queryFn: async () => (await axiosInstance.get<{ data: QuotePackage[] }>(`${QUOTATIONS.PACKAGES}?currency=${currency}`)).data.data,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
  const itemsQuery = useQuery({
    queryKey: ['quotations', 'items'],
    queryFn: async () => (await axiosInstance.get<{ data: CatalogItem[] }>(QUOTATIONS.ITEMS)).data.data,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const packages = useMemo(() => packagesQuery.data ?? [], [packagesQuery.data]);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  // Selectable tiers even if the catalog fetch fails - the estimate API
  // validates the slug server-side.
  const packageOptions = useMemo(
    () =>
      packages.length > 0
        ? packages
        : [{ slug: 'essential', name: 'Essential' }, { slug: 'professional', name: 'Professional' }, { slug: 'enterprise', name: 'Enterprise' }],
    [packages],
  );
  const activePlan = packageOptions.some((p) => p.slug === plan) ? plan : (packageOptions[0]?.slug ?? plan);
  const activePackage = packages.find((p) => p.slug === activePlan) ?? packages[0];

  // Package card follows the chosen currency instantly; converted figures
  // swap in as the refetch lands, natives read as honest references meanwhile.
  const pkgMoney = (pkg: QuotePackage, which: 'monthly' | 'yearly' | 'onboarding' | 'maintenance'): string => {
    if (currency !== 'UGX' && pkg.currency === currency && pkg.converted) {
      const v = pkg.converted[which];
      if (v != null) return formatCurrency(v, currency);
    }
    if (which === 'monthly') return `$${Number(pkg.price_monthly_usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    if (which === 'yearly') return pkg.price_yearly_usd != null ? `$${Number(pkg.price_yearly_usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '-';
    if (which === 'onboarding') return `$${Number(pkg.onboarding_fee_usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    return `UGX ${fmtUgx(pkg.maintenance_fee_ugx)}`;
  };

  const [totals, setTotals] = useState<QuoteTotals | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const extras = Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([code, q]) => ({ code, qty: q }));
    const timer = setTimeout(() => {
      setCalculating(true);
      const overrides = Object.entries(prices)
        .filter(([, p]) => p >= 0)
        .map(([code, unit_ugx]) => ({ code, unit_ugx }));
      axiosInstance
        .post<{ data: QuoteTotals }>(QUOTATIONS.ESTIMATE, {
          plan: activePlan,
          billing,
          currency,
          drivers: { tills, staff, branches },
          items: extras,
          price_overrides: overrides,
          custom_lines: customLines.filter((r) => r.label.trim() && parseFloat(r.amount) > 0).map((r) => ({ label: r.label.trim(), amount_ugx: parseFloat(r.amount) })),
          discount_percent: discount,
          vat_percent: vat,
        })
        .then(({ data }) => setTotals(data.data))
        .catch(() => setTotals(null))
        .finally(() => setCalculating(false));
    }, 450);
    return () => clearTimeout(timer);
  }, [activePlan, billing, currency, tills, staff, branches, qty, prices, customLines, discount, vat]);

  // Display keys off the SELECTED currency so the switch reflects
  // immediately; converted figures replace natives as responses land.
  const freshConverted = totals != null && totals.currency === currency && totals.converted?.available
    ? totals.converted
    : null;
  const convTotals: Record<string, number> = freshConverted?.totals ?? {};
  const convUnits: Record<string, number> = {};
  (freshConverted?.lines ?? []).forEach((l) => { convUnits[l.code] = l.total; });
  const convCustoms: Record<string, number> = {};
  (freshConverted?.customs ?? []).forEach((c) => { convCustoms[c.label] = c.amount; });
  const grandDisplay = (() => {
    if (!totals) return '';
    if (currency === 'UGX') return `UGX ${fmtUgx(totals.grand_total_ugx)}`;
    const v = convTotals[`grand_${currency}`];
    if (v != null) return formatCurrency(v, currency);
    return formatCurrency(totals.grand_total_ugx, currency);
  })();
  const grandApprox =
    totals == null
      ? ''
      : currency !== 'UGX'
        ? `≈ UGX ${fmtUgx(totals.grand_total_ugx)}`
        : `≈ $${Number(totals.grand_total_usd).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const money = (ugx: number, key?: string) => {
    if (currency === 'UGX' || !totals) return `UGX ${fmtUgx(ugx)}`;
    if (key && convTotals[`${key}_${currency}`] != null) {
      return formatCurrency(convTotals[`${key}_${currency}`], currency);
    }
    return formatCurrency(ugx, currency);
  };
  const lineMoney = (code: string, ugx: number) => {
    if (currency === 'UGX') return `UGX ${fmtUgx(ugx)}`;
    if (convUnits[code] != null) return formatCurrency(convUnits[code], currency);
    return formatCurrency(ugx, currency);
  };
  const customMoney = (label: string, ugx: number) => {
    if (currency === 'UGX') return `UGX ${fmtUgx(ugx)}`;
    if (convCustoms[label] != null) return formatCurrency(convCustoms[label], currency);
    return formatCurrency(ugx, currency);
  };
  const softwareMoney = () => {
    if (!totals || currency === 'UGX') {
      return `UGX ${fmtUgx((totals?.subscription_first_year_ugx ?? 0) + (totals?.onboarding_ugx ?? 0))}`;
    }
    const sub = convTotals[`subscription_${currency}`];
    const onb = convTotals[`onboarding_${currency}`];
    if (sub != null && onb != null) {
      return formatCurrency(sub + onb, currency);
    }
    return formatCurrency(totals.subscription_first_year_ugx + totals.onboarding_ugx, currency);
  };

  async function downloadPdf() {
    setDownloading(true);
    try {
      const extras = Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([code, q]) => ({ code, qty: q }));
      const res = await axiosInstance.post(QUOTATIONS.DOWNLOAD, {
        plan: activePlan,
        billing,
        currency,
        drivers: { tills, staff, branches },
        items: extras,
        price_overrides: Object.entries(prices)
          .filter(([, p]) => p >= 0)
          .map(([code, unit_ugx]) => ({ code, unit_ugx })),
        custom_lines: customLines.filter((r) => r.label.trim() && parseFloat(r.amount) > 0).map((r) => ({ label: r.label.trim(), amount_ugx: parseFloat(r.amount) })),
        discount_percent: discount,
        vat_percent: vat,
        rep_name: repName.trim() || undefined,
        rep_phone: repPhone.trim() || undefined,
        customer_name: customer.trim() || undefined,
      }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `custosell-budget-${activePlan}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16">
      <style>{`#investment-budget input:focus, #investment-budget select:focus, #investment-budget textarea:focus { outline: 2px solid #2563eb; outline-offset: 0; border-color: #2563eb; }`}</style>
      <div id="investment-budget" className="contents">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-3">
          Investment <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">Budget</span>
        </h1>
        <p className="text-base text-gray-500 max-w-2xl mx-auto">
          Hardware, installation, subscription and maintenance in one downloadable budget - UGX with USD approximations.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-gray-200 bg-white/80 p-5 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">1. Package &amp; scale</h2>
        {activePackage && (
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-blue-50/60 p-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{activePackage.name} monthly</p>
              <p className="text-sm font-bold text-gray-900">{pkgMoney(activePackage, 'monthly')}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Yearly</p>
              <p className="text-sm font-bold text-gray-900">{pkgMoney(activePackage, 'yearly')}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Onboarding</p>
              <p className="text-sm font-bold text-gray-900">{pkgMoney(activePackage, 'onboarding')}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Maintenance/yr</p>
              <p className="text-sm font-bold text-gray-900">{pkgMoney(activePackage, 'maintenance')}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label className="block col-span-2 sm:col-span-1">
            <span className="mb-1 block text-xs font-medium text-gray-600">Package</span>
            <select value={activePlan} onChange={(e) => setPlan(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm" disabled={packagesQuery.isLoading}>
              {packageOptions.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
            {packagesQuery.isLoading && <p className="mt-1 text-xs text-gray-400">Loading packages…</p>}
            {packagesQuery.isError && <p className="mt-1 text-xs text-gray-400">Package details unavailable - tiers still selectable.</p>}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Billing</span>
            <select value={billing} onChange={(e) => setBilling(e.target.value as 'monthly' | 'yearly')} className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm">
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol}) - {c.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Business name (on PDF)</span>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={120} placeholder="e.g. Divine Mercy"
              className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm" />
          </label>
          <NumberField label="Tills" value={tills} min={1} max={500} onChange={setTills} />
          <NumberField label="Staff" value={staff} min={1} max={5000} onChange={setStaff} />
          <NumberField label="Branches" value={branches} min={1} max={100} onChange={setBranches} />
        </div>
      </div>

      <div className="rounded-2xl border-2 border-gray-200 bg-white/80 p-5 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">2. Extra hardware</h2>
        <p className="text-xs text-gray-500 mb-4">On top of the package kit. Tap a row to expand specs.</p>
        <div className="space-y-2">
          {(items ?? []).map((item) => (
            <div key={item.code} className="flex items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5">
              <LineIcon category={item.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">{item.specs}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-blue-700">
                  {editingPrice === item.code ? (
                    <input
                      autoFocus
                      type="number"
                      min={0}
                      defaultValue={prices[item.code] ?? item.price_ugx}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        setPrices((p) => {
                          const next = { ...p };
                          if (Number.isFinite(v) && v >= 0) next[item.code] = v;
                          else delete next[item.code];
                          return next;
                        });
                        setEditingPrice(null);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      aria-label={`Edit ${item.name} price in ${currency}`}
                      className="h-7 w-28 rounded-md border border-blue-400 px-1.5 text-xs"
                    />
                  ) : (
                    <>
                      {prices[item.code] != null
                        ? money(prices[item.code])
                        : money(item.price_ugx)}
                      {prices[item.code] != null && <span className="font-medium text-gray-400">(edited)</span>}
                      <button
                        type="button"
                        onClick={() => setEditingPrice(item.code)}
                        aria-label={`Edit ${item.name} price`}
                        title={`Edit price (${currency})`}
                        className="rounded p-0.5 text-blue-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                      </button>
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" aria-label={`Remove one ${item.name}`}
                  onClick={() => setQty((q) => ({ ...q, [item.code]: Math.max(0, (q[item.code] ?? 0) - 1) }))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">{qty[item.code] ?? 0}</span>
                <button type="button" aria-label={`Add one ${item.name}`}
                  onClick={() => setQty((q) => ({ ...q, [item.code]: Math.min(10000, (q[item.code] ?? 0) + 1) }))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-gray-200 bg-white/80 p-5 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">3. Adjustments</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Discount % (hardware)</span>
            <input type="number" value={discount} min={0} max={100} onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value || '0'))))}
              className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">VAT %</span>
            <input type="number" value={vat} min={0} max={100} onChange={(e) => setVat(Math.min(100, Math.max(0, parseFloat(e.target.value || '0'))))}
              className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Sales rep name</span>
            <input value={repName} onChange={(e) => setRepName(e.target.value)} maxLength={120} className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Sales rep phone</span>
            <input value={repPhone} onChange={(e) => setRepPhone(e.target.value)} maxLength={32} className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm" />
          </label>
        </div>
        <div className="mt-3">
          <span className="mb-1 block text-xs font-medium text-gray-600">Extra costs (travel, levies…)</span>
          {customLines.map((row, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input value={row.label} maxLength={120} placeholder="Description"
                onChange={(e) => setCustomLines((rows) => rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
                className="h-9 min-w-0 flex-[2] rounded-lg border border-gray-200 px-2 text-sm" />
              <input value={row.amount} inputMode="decimal" placeholder="UGX"
                onChange={(e) => setCustomLines((rows) => rows.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))}
                className="h-9 w-28 shrink-0 rounded-lg border border-gray-200 px-2 text-sm" />
              <button type="button" aria-label="Remove cost line"
                onClick={() => setCustomLines((rows) => rows.filter((_, j) => j !== i))}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setCustomLines((rows) => [...rows, { label: '', amount: '' }])}
            className="text-sm font-semibold text-blue-600 hover:underline">+ Add cost line</button>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/60 p-5 sm:p-6 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Your investment total {calculating && <span className="text-xs font-medium text-blue-500">Updating prices…</span>}</h2>
        {calculating && !totals ? (
          <p className="text-sm text-gray-500">Calculating…</p>
        ) : totals ? (
          <>
            <div className="scroll-x mb-4">
              <table className="w-full text-sm">
                <tbody>
                  {totals.hardware_lines.map((l) => (
                    <tr key={l.code} className="border-b border-gray-100">
                      <td className="py-2 pr-2 text-left">
                        <span className="flex items-center gap-2 text-gray-700">
                          <LineIcon category={l.category} />
                          <span className="font-medium">{l.name} &times; {l.qty}</span>
                        </span>
                        {l.specs && <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{l.specs}</span>}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">{lineMoney(l.code, l.line_total_ugx)}</td>
                    </tr>
                  ))}
                  {totals.custom_lines.map((c, i) => (
                    <tr key={`c-${i}`} className="border-b border-gray-100">
                      <td className="py-2 pr-2 text-left text-gray-700">{c.label}</td>
                      <td className="py-2 text-right font-medium tabular-nums">{customMoney(c.label, c.amount_ugx)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-left text-gray-700">Software first year + onboarding</td>
                    <td className="py-2 text-right font-medium tabular-nums">{softwareMoney()}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-left text-gray-700">Annual maintenance</td>
                    <td className="py-2 text-right font-medium tabular-nums">{money(totals.maintenance_annual_ugx, 'maintenance')}</td>
                  </tr>
                  {totals.discount_ugx > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-2 text-left text-gray-700">Discount ({totals.discount_percent}%)</td>
                      <td className="py-2 text-right font-medium tabular-nums">-{money(totals.discount_ugx, 'discount')}</td>
                    </tr>
                  )}
                  {totals.vat_ugx > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-2 text-left text-gray-700">VAT ({totals.vat_percent}%)</td>
                      <td className="py-2 text-right font-medium tabular-nums">{money(totals.vat_ugx, 'vat')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-blue-700">{grandDisplay}</p>
            <p className="text-sm text-gray-500 mt-1">
              {grandApprox} &middot;{' '}
              {money(totals.one_time_ugx, 'one_time')} one-time + {money(totals.annual_recurring_ugx, 'annual')}/year after
            </p>
            <p className="text-xs text-gray-400 mt-2">{totals.usd_rate_note}</p>
            {totals.currency !== 'UGX' && totals.converted && (
              <p className="text-xs text-gray-400 mt-1">{totals.converted.note}</p>
            )}
            <details className="mt-3 rounded-xl border border-gray-200 px-4 py-2 text-left">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700">Site requirements checklist</summary>
              <ul className="mt-2 space-y-1.5">
                {totals.operational_requirements.map((r) => (
                  <li key={r.area} className="text-xs leading-relaxed text-gray-600">
                    <span className="font-semibold text-gray-800">{r.area}</span> ({r.provided_by}) - {r.requirement}
                  </li>
                ))}
              </ul>
            </details>
            <Button size="lg" onClick={() => void downloadPdf()} disabled={downloading} className="gap-2 mt-4">
              <Download className="w-4 h-4" />
              {downloading ? 'Preparing…' : 'Download PDF budget'}
            </Button>
          </>
        ) : (
          <p className="text-sm text-gray-500">Could not calculate - check your inputs.</p>
        )}
        <p className="mt-4">
          <Link to={ROUTES.PRICING} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">
            Compare plans <ArrowRight className="w-4 h-4" />
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
