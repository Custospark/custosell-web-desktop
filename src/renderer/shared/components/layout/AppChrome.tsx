import { Outlet } from 'react-router-dom';
import { AppStatusBanners } from './AppStatusBanners';

/** Authenticated viewport shell: status banners on top, layout chrome fills the rest. */
export function AppChrome() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50/30">
      <AppStatusBanners />
      <Outlet />
    </div>
  );
}
