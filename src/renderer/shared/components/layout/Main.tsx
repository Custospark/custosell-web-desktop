import { Outlet } from 'react-router-dom';

export function Main() {
  return (
    <main className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
      <Outlet />
    </main>
  );
}
