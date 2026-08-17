import { Outlet } from 'react-router-dom';
import { AppStatusBanners } from './AppStatusBanners';
import { SearchTopBar } from './SearchTopBar';
import { SearchModal } from './search/SearchModal';
import { useSearchKeyboard } from './search/useSearchKeyboard';
import { canUseGlobalSearch } from './search/searchTypes';
import { CustosellLoader } from '../loading/CustosellLoader';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useAppContext } from '../../../app/contexts/AppContext';

/**
 * Authenticated viewport shell: status banners + global search top bar on top,
 * layout chrome fills the rest. The search palette is mounted here (always, for
 * eligible accounts) so ⌘K / Ctrl+K works app-wide.
 * In immersive POS mode every piece of chrome (banners, top bar, search) is
 * dropped so the cashier gets a clean full-screen surface.
 */
export function AppChrome() {
  const user = useAppSelector((s) => s.auth.user);
  const isSwitchingAccount = useAppSelector((s) => s.auth.isSwitchingAccount);
  const { state } = useAppContext();
  const { isOpen: searchOpen, closeSearch } = useSearchKeyboard();
  const canSearch = !state.contentFullscreen && canUseGlobalSearch(user);

  // While a linked-account switch is in flight, cover the entire app (including
  // the previous account's dashboard) so no stale data is ever visible - the
  // same experience as a fresh login.
  if (isSwitchingAccount) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white">
        <CustosellLoader fullPage message="Switching account..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-gray-50/30">
      {!state.contentFullscreen && <AppStatusBanners />}
      {!state.contentFullscreen && <SearchTopBar />}
      <Outlet />
      {canSearch && <SearchModal isOpen={searchOpen} onClose={closeSearch} />}
    </div>
  );
}
