import { Outlet } from 'react-router-dom';

export default function AccountPage() {
  return (
    <div className="flex-1 min-w-0">
      <Outlet />
    </div>
  );
}
