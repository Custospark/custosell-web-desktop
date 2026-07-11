export const hrCompanyAssetsKeys = {
  all: ['hr', 'company-assets'] as const,
  list: (filters?: Record<string, string | number | undefined>) =>
    [...hrCompanyAssetsKeys.all, 'list', filters ?? {}] as const,
  detail: (id: number) => [...hrCompanyAssetsKeys.all, 'detail', id] as const,
  assignments: (id: number) => [...hrCompanyAssetsKeys.all, 'assignments', id] as const,
  maintenanceExpenses: (id: number) =>
    [...hrCompanyAssetsKeys.all, 'maintenance-expenses', id] as const,
};
