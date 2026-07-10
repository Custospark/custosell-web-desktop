import { Outlet } from 'react-router-dom';

/** Shell only — section navigation lives in the app Sidebar (HR & Payroll group). */
export default function HrLayout() {
  return (
    <div className="min-h-0 flex-1 pb-8">
      <Outlet />
    </div>
  );
}
