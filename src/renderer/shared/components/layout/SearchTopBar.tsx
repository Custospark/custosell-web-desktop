import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canUseGlobalSearch } from './search/searchTypes';
import { SearchBar } from './search/SearchBar';

/**
 * Global search top bar — rendered above the header (Navbar), mirroring how
 * Custocare keeps its search in the status/top bars. Personal and business
 * accounts only; storefront buyers get no workspace and no strip.
 */
export function SearchTopBar() {
  const user = useAppSelector((s) => s.auth.user);

  if (!canUseGlobalSearch(user)) return null;

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-2 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <SearchBar />
      </div>
    </div>
  );
}
