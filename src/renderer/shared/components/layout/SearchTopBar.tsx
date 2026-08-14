import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canUseGlobalSearch } from './search/searchTypes';
import { SearchBar } from './search/SearchBar';
import { TopBarQuickActions } from './TopBarQuickActions';
import { TopBarStatus } from './TopBarStatus';

/**
 * Global search top bar - rendered above the header (Navbar), mirroring
 * Custocare's status bar: connectivity + app version on the left, search in the
 * center, and orders / notifications / profile shortcuts on the right. Personal
 * and business accounts only; storefront buyers get no workspace and no strip.
 */
export function SearchTopBar() {
  const user = useAppSelector((s) => s.auth.user);

  if (!canUseGlobalSearch(user)) return null;

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-2 py-2.5 sm:px-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <TopBarStatus />
        <div className="mx-1 min-w-0 max-w-full flex-1 sm:mx-3 sm:max-w-lg">
          <SearchBar />
        </div>
        <TopBarQuickActions />
      </div>
    </div>
  );
}
