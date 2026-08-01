import type { AuthUser } from '../../../../app/store/slices/authSlice';

/** A single navigable result from the sidebar nav catalog (module or page). */
export interface SearchableNavItem {
  id: string;
  label: string;
  description: string;
  route: string;
  /** Sidebar module (group) this item belongs to. */
  group: string;
  keywords: string[];
}

/**
 * Global search is only available on personal and business accounts.
 * Storefront buyers (Discover-only shopping accounts) do not get a workspace
 * to navigate, so the palette is hidden for them.
 */
export function canUseGlobalSearch(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.account_type !== 'storefront_buyer';
}
