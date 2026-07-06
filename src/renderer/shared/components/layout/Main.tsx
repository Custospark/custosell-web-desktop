import { Outlet } from 'react-router-dom';

export function Main() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-6">
      <Outlet />
    </main>
  );
}
