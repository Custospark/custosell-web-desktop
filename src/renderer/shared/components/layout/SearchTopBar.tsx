import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canUseGlobalSearch } from './search/searchTypes';
import { SearchBar } from './search/SearchBar';
import { TopBarQuickActions } from './TopBarQuickActions';
import { TopBarStatus } from './TopBarStatus';

/**
 * Global search top bar — rendered above the header (Navbar), mirroring
 * Custocare's status bar: connectivity + app version on the left, search in the
 * center, and orders / notifications / profile shortcuts on the right. Personal
 * and business accounts only; storefront buyers get no workspace and no strip.
 */
export function SearchTopBar() {
  const user = useAppSelector((s) => s.auth.user);

  if (!canUseGlobalSearch(user)) return null;

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-2 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 sm:gap-4">
        <TopBarStatus />
        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>
        <TopBarQuickActions />
      </div>
    </div>
  );
}
