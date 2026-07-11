export const HR_COMPANY_ASSETS_API = {
  LIST: '/hr/company-assets',
  ITEM: (id: number) => `/hr/company-assets/${id}`,
  assign: (id: number) => `/hr/company-assets/${id}/assign`,
  transfer: (id: number) => `/hr/company-assets/${id}/transfer`,
  return: (id: number) => `/hr/company-assets/${id}/return`,
  assignments: (id: number) => `/hr/company-assets/${id}/assignments`,
  maintenanceExpenses: (id: number) => `/hr/company-assets/${id}/maintenance-expenses`,
} as const;
