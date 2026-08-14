import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { FORECASTING } from './forecastingEndpoints';
import { forecastingKeys } from './forecastingQueryKeys';
import type {
  BudgetVsActual,
  BudgetVsActualParams,
  CashForecast,
  CashForecastParams,
  CreateBudgetLinePayload,
  CreateBudgetPayload,
  CreateScenarioPayload,
  ForecastBudget,
  ForecastBudgetLine,
  ForecastKpis,
  ForecastScenario,
  ForecastScenarioRun,
  ForecastSnapshot,
  ForecastingOverview,
  JustifyLinePayload,
  KpiParams,
  OverviewParams,
  RollBudgetPayload,
  RunScenarioPayload,
  UpdateBudgetLinePayload,
  UpdateBudgetPayload,
  UpdateScenarioPayload,
} from './forecastingTypes';

function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const body = payload as { data?: unknown };
    if (Array.isArray(body.data)) return body.data as T[];
  }
  return [];
}

function cleanParams(params?: Record<string, string | number | undefined | null>) {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

const listDefaults = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
};

function useForecastErrorToast() {
  const { showToast } = useToast();
  return (err: AxiosError<{ message?: string }>, fallback: string) => {
    showToast('error', sanitizeErrorMessage(err, fallback));
  };
}

export function useForecastingOverview(params?: OverviewParams, enabled = true) {
  return useQuery({
    queryKey: forecastingKeys.overview(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(FORECASTING.OVERVIEW, {
        params: cleanParams({
          as_of_date: params?.as_of_date,
          horizon_months: params?.horizon_months,
          period_id: params?.period_id,
          start_date: params?.start_date,
          end_date: params?.end_date,
        }),
      });
      return unwrapEntity<ForecastingOverview>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCashForecast(params?: CashForecastParams, enabled = true) {
  return useQuery({
    queryKey: forecastingKeys.cash(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(FORECASTING.CASH_FORECAST, {
        params: cleanParams({
          as_of_date: params?.as_of_date,
          horizon_months: params?.horizon_months,
          period_id: params?.period_id,
        }),
      });
      return unwrapEntity<CashForecast>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useBudgetVsActual(params?: BudgetVsActualParams, enabled = true) {
  return useQuery({
    queryKey: forecastingKeys.bva(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(FORECASTING.BUDGET_VS_ACTUAL, {
        params: cleanParams({
          period_id: params?.period_id,
          start_date: params?.start_date,
          end_date: params?.end_date,
        }),
      });
      return unwrapEntity<BudgetVsActual>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useForecastKpis(params?: KpiParams, enabled = true) {
  return useQuery({
    queryKey: forecastingKeys.kpis(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(FORECASTING.KPIS, {
        params: cleanParams({
          mode: params?.mode,
          as_of_date: params?.as_of_date,
        }),
      });
      return unwrapEntity<ForecastKpis>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useForecastBudgets(enabled = true) {
  return useQuery({
    queryKey: forecastingKeys.budgets(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(FORECASTING.BUDGETS);
      return unwrapList<ForecastBudget>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useForecastBudget(id: number, enabled = true) {
  return useQuery({
    queryKey: forecastingKeys.budget(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(FORECASTING.BUDGET(id));
      return unwrapEntity<ForecastBudget>(data);
    },
    enabled: enabled && id > 0,
    ...listDefaults,
  });
}

export function useCreateForecastBudget() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateBudgetPayload) => {
      const { data } = await axiosInstance.post(FORECASTING.BUDGETS, payload);
      return unwrapEntity<ForecastBudget>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.budgets() });
      showToast('success', 'Budget created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create budget'),
  });
}

export function useUpdateForecastBudget() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateBudgetPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(FORECASTING.BUDGET(id), payload);
      return unwrapEntity<ForecastBudget>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.budgets() });
      void qc.invalidateQueries({ queryKey: forecastingKeys.budget(vars.id) });
      showToast('success', 'Budget updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update budget'),
  });
}

export function useDeleteForecastBudget() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(FORECASTING.BUDGET(id));
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.budgets() });
      showToast('success', 'Budget deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete budget'),
  });
}

export function useCreateForecastBudgetLine() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async ({ budgetId, ...payload }: CreateBudgetLinePayload & { budgetId: number }) => {
      const { data } = await axiosInstance.post(FORECASTING.BUDGET_LINES(budgetId), payload);
      return unwrapEntity<ForecastBudgetLine>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.budget(vars.budgetId) });
      void qc.invalidateQueries({ queryKey: forecastingKeys.budgets() });
      showToast('success', 'Budget line added');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not add budget line'),
  });
}

export function useUpdateForecastBudgetLine() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async ({
      budgetId,
      lineId,
      ...payload
    }: UpdateBudgetLinePayload & { budgetId: number; lineId: number }) => {
      const { data } = await axiosInstance.patch(FORECASTING.BUDGET_LINE(budgetId, lineId), payload);
      return unwrapEntity<ForecastBudgetLine>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.budget(vars.budgetId) });
      showToast('success', 'Budget line updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update budget line'),
  });
}

export function useDeleteForecastBudgetLine() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async ({ budgetId, lineId }: { budgetId: number; lineId: number }) => {
      await axiosInstance.delete(FORECASTING.BUDGET_LINE(budgetId, lineId));
      return { budgetId, lineId };
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.budget(vars.budgetId) });
      showToast('success', 'Budget line deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete budget line'),
  });
}

export function useJustifyForecastBudgetLine() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async ({
      budgetId,
      lineId,
      ...payload
    }: JustifyLinePayload & { budgetId: number; lineId: number }) => {
      const { data } = await axiosInstance.post(FORECASTING.BUDGET_LINE_JUSTIFY(budgetId, lineId), payload);
      return unwrapEntity<ForecastBudgetLine>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.budget(vars.budgetId) });
      showToast('success', 'Line justified');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not justify line'),
  });
}

export function useApproveForecastBudgetLine() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async ({ budgetId, lineId }: { budgetId: number; lineId: number }) => {
      const { data } = await axiosInstance.post(FORECASTING.BUDGET_LINE_APPROVE(budgetId, lineId));
      return unwrapEntity<ForecastBudgetLine>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.budget(vars.budgetId) });
      showToast('success', 'Line approved');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not approve line'),
  });
}

export function useRollForecastBudget() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async ({ budgetId, ...payload }: RollBudgetPayload & { budgetId: number }) => {
      const { data } = await axiosInstance.post(FORECASTING.BUDGET_ROLL(budgetId), payload);
      return unwrapEntity<ForecastSnapshot>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.budget(vars.budgetId) });
      void qc.invalidateQueries({ queryKey: [...forecastingKeys.all, 'snapshots'] });
      showToast('success', 'Forecast rolled - snapshot saved');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not roll forecast'),
  });
}

export function useForecastSnapshots(forecastBudgetId?: number | null, enabled = true) {
  return useQuery({
    queryKey: forecastingKeys.snapshots({ forecast_budget_id: forecastBudgetId ?? undefined }),
    queryFn: async () => {
      const { data } = await axiosInstance.get(FORECASTING.SNAPSHOTS, {
        params: cleanParams({ forecast_budget_id: forecastBudgetId }),
      });
      return unwrapList<ForecastSnapshot>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useForecastScenarios(enabled = true) {
  return useQuery({
    queryKey: forecastingKeys.scenarios(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(FORECASTING.SCENARIOS);
      return unwrapList<ForecastScenario>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useForecastScenario(id: number, enabled = true) {
  return useQuery({
    queryKey: forecastingKeys.scenario(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(FORECASTING.SCENARIO(id));
      return unwrapEntity<ForecastScenario>(data);
    },
    enabled: enabled && id > 0,
    ...listDefaults,
  });
}

export function useCreateForecastScenario() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateScenarioPayload) => {
      const { data } = await axiosInstance.post(FORECASTING.SCENARIOS, payload);
      return unwrapEntity<ForecastScenario>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.scenarios() });
      showToast('success', 'Scenario created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create scenario'),
  });
}

export function useUpdateForecastScenario() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateScenarioPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(FORECASTING.SCENARIO(id), payload);
      return unwrapEntity<ForecastScenario>(data);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.scenarios() });
      void qc.invalidateQueries({ queryKey: forecastingKeys.scenario(vars.id) });
      showToast('success', 'Scenario updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update scenario'),
  });
}

export function useDeleteForecastScenario() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(FORECASTING.SCENARIO(id));
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: forecastingKeys.scenarios() });
      showToast('success', 'Scenario deleted');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not delete scenario'),
  });
}

export function useRunForecastScenario() {
  const { showToast } = useToast();
  const onError = useForecastErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: RunScenarioPayload & { id: number }) => {
      const { data } = await axiosInstance.post(FORECASTING.SCENARIO_RUN(id), payload);
      return unwrapEntity<ForecastScenarioRun>(data);
    },
    onSuccess: () => {
      showToast('success', 'Scenario run complete');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not run scenario'),
  });
}
