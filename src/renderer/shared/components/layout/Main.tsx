import { Outlet } from 'react-router-dom';

export function Main() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </main>
  );
}
