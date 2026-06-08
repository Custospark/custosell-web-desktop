export interface Role {
  id: number;
  business_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[] | Record<string, boolean>;
  is_default: boolean;
  is_system?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleData {
  name: string;
  slug: string;
  description?: string | null;
  permissions: string[];
  is_default?: boolean;
}

export interface UpdateRoleData extends Partial<CreateRoleData> {}

export const PERMISSIONS = [
  'sales.create',
  'sales.read',
  'sales.update',
  'sales.delete',
  'products.create',
  'products.read',
  'products.update',
  'products.delete',
  'customers.create',
  'customers.read',
  'customers.update',
  'customers.delete',
  'settings.read',
  'settings.update',
  'reports.read',
  'shifts.close_report',
  'staff.create',
  'staff.read',
  'staff.update',
  'staff.delete',
] as const;

export function rolePermissionKeys(permissions: Role['permissions']): string[] {
  if (Array.isArray(permissions)) return permissions;
  return Object.entries(permissions)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}
