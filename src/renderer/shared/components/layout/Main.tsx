import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';

export function Main() {
  const location = useLocation();
  const pipelineBoardOpen = /^\/pipeline\/boards\/\d+/.test(location.pathname);
  const documentsCabinetOpen = /^\/documents\/cabinets\/\d+/.test(location.pathname);

  return (
    <main
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-x-hidden',
        pipelineBoardOpen || documentsCabinetOpen ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 sm:p-6',
      )}
    >
      <Outlet />
    </main>
  );
}
