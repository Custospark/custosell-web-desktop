import { Outlet } from 'react-router-dom';

export default function EstimatesLayout() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-x-auto">
      <Outlet />
    </div>
  );
}