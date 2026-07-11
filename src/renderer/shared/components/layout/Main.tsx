import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';

export function Main() {
  const location = useLocation();
  const pipelineBoardOpen = /^\/(?:pipeline|estimates)\/boards\/\d+/.test(location.pathname);
  const documentsCabinetOpen = /^\/documents\/cabinets\/\d+/.test(location.pathname);
  const marketplaceOpen = location.pathname === '/inventory/marketplace';

  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-x-hidden',
        pipelineBoardOpen || documentsCabinetOpen || marketplaceOpen
          ? 'overflow-hidden p-0'
          : 'overflow-y-auto p-4 sm:p-6',
      )}
    >
      <Outlet />
    </main>
  );
}
