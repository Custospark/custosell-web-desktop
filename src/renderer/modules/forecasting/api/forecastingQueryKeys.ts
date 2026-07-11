export const forecastingKeys = {
  all: ['forecasting'] as const,
  overview: (filters?: Record<string, unknown>) =>
    [...forecastingKeys.all, 'overview', filters ?? {}] as const,
  cash: (filters?: Record<string, unknown>) =>
    [...forecastingKeys.all, 'cash', filters ?? {}] as const,
  bva: (filters?: Record<string, unknown>) =>
    [...forecastingKeys.all, 'bva', filters ?? {}] as const,
  kpis: (filters?: Record<string, unknown>) =>
    [...forecastingKeys.all, 'kpis', filters ?? {}] as const,
  budgets: () => [...forecastingKeys.all, 'budgets'] as const,
  budget: (id: number) => [...forecastingKeys.all, 'budget', id] as const,
  snapshots: (filters?: Record<string, unknown>) =>
    [...forecastingKeys.all, 'snapshots', filters ?? {}] as const,
  scenarios: () => [...forecastingKeys.all, 'scenarios'] as const,
  scenario: (id: number) => [...forecastingKeys.all, 'scenario', id] as const,
};
