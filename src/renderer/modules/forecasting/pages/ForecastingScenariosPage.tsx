import { useState } from 'react';
import { Layers, Play, Plus, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import {
  useCreateForecastScenario,
  useDeleteForecastScenario,
  useForecastScenarios,
  useRunForecastScenario,
} from '../api/useForecastingQueries';
import type { ForecastScenarioRun } from '../api/forecastingTypes';
import {
  AssumptionsWarningsPanel,
  CoverageStatusBadge,
  ForecastMetric,
} from '../ui/ForecastBadges';
import { formatForecastMoney } from '../ui/forecastFormat';
import { ForecastingEmptyState, ForecastingPageHeader, ForecastingSectionCard } from '../ui/ForecastingSurface';
import { FORECAST_SURFACE } from '../ui/forecastingSurfaceStyles';

export default function ForecastingScenariosPage() {
  const { data: scenarios = [], isLoading } = useForecastScenarios();
  const createScenario = useCreateForecastScenario();
  const deleteScenario = useDeleteForecastScenario();
  const runScenario = useRunForecastScenario();

  const [name, setName] = useState('');
  const [horizon, setHorizon] = useState('6');
  const [hireSalary, setHireSalary] = useState('');
  const [extraOpex, setExtraOpex] = useState('');
  const [revenueUplift, setRevenueUplift] = useState('');
  const [runResult, setRunResult] = useState<ForecastScenarioRun | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    const parsedHorizon = Number(horizon);
    const horizonMonths = Number.isFinite(parsedHorizon) && parsedHorizon > 0
      ? Math.min(24, Math.max(1, Math.round(parsedHorizon)))
      : 6;
    createScenario.mutate(
      {
        name: name.trim(),
        horizon_months: horizonMonths,
        hire_basic_salary: hireSalary === '' ? null : Number(hireSalary),
        extra_monthly_opex: extraOpex === '' ? 0 : Number(extraOpex),
        revenue_uplift_pct: revenueUplift === '' ? 0 : Number(revenueUplift),
      },
      {
        onSuccess: () => {
          setName('');
          setHorizon('6');
          setHireSalary('');
          setExtraOpex('');
          setRevenueUplift('');
        },
      },
    );
  };

  const handleRun = (id: number) => {
    runScenario.mutate(
      { id },
      {
        onSuccess: (data) => setRunResult(data),
      },
    );
  };

  return (
    <div className="space-y-5">
      <ForecastingPageHeader
        icon={TrendingUp}
        title="What-if scenarios"
        description="Model a hire, extra opex, or revenue uplift against the baseline cash ladder."
      />

      <ForecastingSectionCard title="Create scenario" description="Saved scenarios can be re-run anytime.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm sm:col-span-2 lg:col-span-1">
            <span className="mb-1 block font-medium text-gray-700">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Hire sales lead"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Horizon (months)</span>
            <input
              type="number"
              min={1}
              max={24}
              inputMode="numeric"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              onBlur={() => {
                if (horizon.trim() === '') {
                  setHorizon('6');
                  return;
                }
                const n = Number(horizon);
                if (!Number.isFinite(n) || n < 1) setHorizon('1');
                else if (n > 24) setHorizon('24');
                else setHorizon(String(Math.round(n)));
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="1-24"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Hire basic salary</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={hireSalary}
              onChange={(e) => setHireSalary(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Extra monthly opex</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={extraOpex}
              onChange={(e) => setExtraOpex(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="0"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Revenue uplift %</span>
            <input
              type="number"
              step="0.1"
              value={revenueUplift}
              onChange={(e) => setRevenueUplift(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="0"
            />
          </label>
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={handleCreate} loading={createScenario.isPending} disabled={!name.trim()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create scenario
          </Button>
        </div>
      </ForecastingSectionCard>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <CustosellLoader />
        </div>
      ) : scenarios.length === 0 ? (
        <ForecastingEmptyState
          icon={<Layers className="h-6 w-6" />}
          title="No scenarios yet"
          description="Create a scenario above, then run it to compare baseline vs what-if cash."
        />
      ) : (
        <div className={cn(FORECAST_SURFACE.tableWrap, 'overflow-x-auto')}>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Horizon</th>
                <th className="px-3 py-2">Hire salary</th>
                <th className="px-3 py-2">Extra opex</th>
                <th className="px-3 py-2">Uplift %</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scenarios.map((scenario) => (
                <tr key={scenario.id}>
                  <td className="px-3 py-2 font-medium text-gray-900">{scenario.name}</td>
                  <td className="px-3 py-2 tabular-nums">{scenario.horizon_months}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {scenario.hire_basic_salary == null ? '-' : formatForecastMoney(scenario.hire_basic_salary)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{formatForecastMoney(scenario.extra_monthly_opex)}</td>
                  <td className="px-3 py-2 tabular-nums">{scenario.revenue_uplift_pct}%</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={runScenario.isPending}
                        onClick={() => handleRun(scenario.id)}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" />
                        Run
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        loading={deleteScenario.isPending}
                        onClick={() => {
                          if (runResult?.scenario.id === scenario.id) setRunResult(null);
                          deleteScenario.mutate(scenario.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {runResult ? (
        <ForecastingSectionCard
          title={`Run result: ${runResult.scenario.name}`}
          description="Baseline vs scenario cash forecast comparison."
        >
          <AssumptionsWarningsPanel assumptions={runResult.assumptions} warnings={runResult.warnings} />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ForecastMetric
              label="Δ Monthly burn"
              value={formatForecastMoney(runResult.delta.monthly_total_burn)}
            />
            <ForecastMetric
              label="Δ Assumed inflow"
              value={formatForecastMoney(runResult.delta.assumed_monthly_inflow)}
            />
            <ForecastMetric
              label="Δ Closing cash (last month)"
              value={formatForecastMoney(runResult.delta.closing_cash_last_month)}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Baseline</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <ForecastMetric
                  label="Total burn"
                  value={formatForecastMoney(runResult.baseline.burn.monthly_total_burn)}
                />
                <ForecastMetric
                  label="Runway"
                  value={
                    <span className="inline-flex items-center gap-2">
                      {runResult.baseline.coverage.runway_months ?? '∞'}
                      <CoverageStatusBadge status={runResult.baseline.coverage.status} />
                    </span>
                  }
                />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Scenario</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <ForecastMetric
                  label="Total burn"
                  value={formatForecastMoney(runResult.scenario_forecast.burn.monthly_total_burn)}
                />
                <ForecastMetric
                  label="Runway"
                  value={
                    <span className="inline-flex items-center gap-2">
                      {runResult.scenario_forecast.coverage.runway_months ?? '∞'}
                      <CoverageStatusBadge status={runResult.scenario_forecast.coverage.status} />
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          <div className={cn(FORECAST_SURFACE.tableWrap, 'mt-4 overflow-x-auto')}>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Baseline close</th>
                  <th className="px-3 py-2">Scenario close</th>
                  <th className="px-3 py-2">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runResult.baseline.months.map((base, idx) => {
                  const scen = runResult.scenario_forecast.months[idx];
                  const delta = (scen?.closing_cash ?? 0) - base.closing_cash;
                  return (
                    <tr key={base.offset}>
                      <td className="px-3 py-2 font-medium text-gray-900">{base.label}</td>
                      <td className="px-3 py-2 font-mono text-xs tabular-nums">
                        {formatForecastMoney(base.closing_cash)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs tabular-nums">
                        {formatForecastMoney(scen?.closing_cash)}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 font-mono text-xs tabular-nums',
                          delta < 0 ? 'text-red-600' : 'text-emerald-700',
                        )}
                      >
                        {formatForecastMoney(delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ForecastingSectionCard>
      ) : null}
    </div>
  );
}
