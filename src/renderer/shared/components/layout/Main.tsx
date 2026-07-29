import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { OnlineOnlyModuleBanner } from './OnlineOnlyModuleBanner';
import { matchOnlineOnlyPath } from './onlineOnlyNav';

export function Main() {
  const location = useLocation();
  const { isCompletelyOffline } = useNetworkStatus();
  const onlineOnly = isCompletelyOffline ? matchOnlineOnlyPath(location.pathname) : null;
  const pipelineBoardOpen = /^\/(?:pipeline|estimates)\/boards\/\d+/.test(location.pathname);
  const documentsCabinetOpen = /^\/documents\/cabinets\/\d+/.test(location.pathname);
  const marketplaceOpen = location.pathname === '/inventory/marketplace';
  const flushLayout = pipelineBoardOpen || documentsCabinetOpen || marketplaceOpen;

  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-x-hidden',
        // Fixed bottom tab bar overlays content on mobile — pb-20 clears it
        flushLayout
          ? 'overflow-x-auto overflow-y-hidden p-0'
          : 'overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-0',
      )}
      data-tour="main-workspace"
      data-scroll-container
    >
      {onlineOnly ? (
        <div className={cn('shrink-0', flushLayout ? 'px-4 pt-4 sm:px-6' : 'mb-4')}>
          <OnlineOnlyModuleBanner title={`${onlineOnly.label} requires connection`} message={onlineOnly.message} />
        </div>
      ) : null}
      <Outlet />
    </main>
  );
}
