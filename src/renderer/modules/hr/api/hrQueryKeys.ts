export const hrKeys = {
  all: ['hr'] as const,
  departments: () => [...hrKeys.all, 'departments'] as const,
  positions: (departmentId?: number | null) =>
    [...hrKeys.all, 'positions', departmentId ?? 'all'] as const,
  employees: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'employees', filters ?? {}] as const,
  employee: (id: number) => [...hrKeys.all, 'employee', id] as const,
  accountOptions: () => [...hrKeys.all, 'account-options'] as const,
  attendance: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'attendance', filters ?? {}] as const,
  leaveTypes: () => [...hrKeys.all, 'leave-types'] as const,
  leaveBalances: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'leave-balances', filters ?? {}] as const,
  leaveRequests: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'leave-requests', filters ?? {}] as const,
  salaryStructures: () => [...hrKeys.all, 'salary-structures'] as const,
  compensations: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'compensations', filters ?? {}] as const,
  payRuns: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'pay-runs', filters ?? {}] as const,
  payRun: (id: number) => [...hrKeys.all, 'pay-run', id] as const,
  payslip: (id: number) => [...hrKeys.all, 'payslip', id] as const,
  onboardingTemplates: () => [...hrKeys.all, 'onboarding-templates'] as const,
  onboardingTasks: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'onboarding-tasks', filters ?? {}] as const,
  reviews: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'reviews', filters ?? {}] as const,
  reportPaye: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'reports', 'paye', filters ?? {}] as const,
  reportNssf: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'reports', 'nssf', filters ?? {}] as const,
  auditLogs: (filters?: Record<string, string | number | undefined>) =>
    [...hrKeys.all, 'audit-logs', filters ?? {}] as const,
};
