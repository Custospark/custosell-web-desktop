export const expenseKeys = {
  all: ['expenses'] as const,
  list: (filters?: Record<string, string>) => [...expenseKeys.all, 'list', filters] as const,
  detail: (id: number) => [...expenseKeys.all, 'detail', id] as const,
  summary: (filters?: Record<string, string>) => [...expenseKeys.all, 'summary', filters] as const,
  categories: () => [...expenseKeys.all, 'categories'] as const,
};
