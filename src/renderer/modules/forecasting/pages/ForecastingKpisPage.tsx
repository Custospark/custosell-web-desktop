import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { useForecastKpis } from '../api/useForecastingQueries';
import type { ForecastKpiMode } from '../api/forecastingTypes';
import {
  AssumptionsWarningsPanel,
  CoverageStatusBadge,
  ForecastMetric,
} from '../ui/ForecastBadges';
import { formatForecastMoney, formatForecastPct } from '../ui/forecastFormat';
import { ForecastingEmptyState, ForecastingPageHeader, ForecastingSectionCard } from '../ui/ForecastingSurface';

export default function ForecastingKpisPage() {
  const [mode, setMode] = useState<ForecastKpiMode>('auto');
  const { data, isLoading, isError, error, refetch } = useForecastKpis({ mode });

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <ForecastingPageHeader
        icon={Target}
        title="Forecast KPIs"
        description="Retail pulse / CAC / LTV / churn, optional SaaS MRR when recurring products exist."
        actions={
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ForecastKpiMode)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
            >
              <option value="auto">Auto</option>
              <option value="retail">Retail</option>
              <option value="saas">SaaS</option>
            </select>
          </label>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <CustosellLoader />
        </div>
      ) : isError || !data ? (
        <ForecastingEmptyState
          icon={<Target className="h-6 w-6" />}
          title="Could not load KPIs"
          description={sanitizeErrorMessage(error, 'Try again in a moment.')}
          action={
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <AssumptionsWarningsPanel assumptions={data.assumptions} warnings={data.warnings} />

          <p className="text-sm text-gray-500">
            Requested <span className="font-medium text-gray-800">{data.mode}</span>
            {' · '}
            Resolved <span className="font-medium text-gray-800">{data.resolved_mode}</span>
            {' · '}
            As of {data.as_of_date}
            {data.has_recurring_products ? ' · Recurring products found' : ' · No recurring products'}
          </p>

          <ForecastingSectionCard title="Retail pulse" description="Trailing 30-day commercial health.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <ForecastMetric
                label="Pulse (30d net sales)"
                value={formatForecastMoney(data.retail.pulse_30d_net_sales)}
              />
              <ForecastMetric
                label="CAC"
                value={data.retail.cac == null ? '—' : formatForecastMoney(data.retail.cac)}
                hint={`${formatForecastMoney(data.retail.acquisition_spend_30d)} spend / ${data.retail.new_customers_30d} new customers`}
              />
              <ForecastMetric label="LTV" value={formatForecastMoney(data.retail.ltv)} />
              <ForecastMetric
                label="Churn (90d)"
                value={formatForecastPct(data.retail.churn_pct_90d)}
                hint={`${data.retail.churned_customers} of ${data.retail.customers_with_purchases} purchasers`}
              />
              <ForecastMetric
                label="Monthly burn"
                value={formatForecastMoney(data.burn.monthly_total_burn)}
                hint={
                  data.burn.coverage ? (
                    <span className="inline-flex items-center gap-2">
                      Runway {data.burn.coverage.runway_months ?? '∞'} mo
                      <CoverageStatusBadge status={data.burn.coverage.status} />
                    </span>
                  ) : undefined
                }
              />
            </div>
          </ForecastingSectionCard>

          {data.resolved_mode === 'saas' && data.saas ? (
            <ForecastingSectionCard title="SaaS proxies" description="MRR is a simple recurring-product proxy, not a billing system.">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ForecastMetric label="MRR" value={formatForecastMoney(data.saas.mrr)} />
                <ForecastMetric label="ARR" value={formatForecastMoney(data.saas.arr)} />
                <ForecastMetric
                  label="Active subscribers (60d)"
                  value={data.saas.active_subscribers_60d}
                />
                <ForecastMetric
                  label="Avg recurring price"
                  value={formatForecastMoney(data.saas.avg_recurring_price)}
                  hint={`${data.saas.recurring_product_count} recurring products`}
                />
              </div>
            </ForecastingSectionCard>
          ) : (
            <ForecastingSectionCard title="SaaS KPIs" description="Mark products as recurring to unlock MRR proxies.">
              <ForecastingEmptyState
                className="border-0 shadow-none py-8"
                title="No SaaS mode active"
                description={
                  data.has_recurring_products
                    ? 'Switch mode to SaaS, or keep Auto when recurring products exist.'
                    : 'Add is_recurring on a product or service to enable SaaS KPIs.'
                }
                action={
                  <Link to={ROUTES.INVENTORY.PRODUCTS}>
                    <Button size="sm" variant="outline">
                      Open products
                    </Button>
                  </Link>
                }
              />
            </ForecastingSectionCard>
          )}
        </>
      )}
    </div>
  );
}
