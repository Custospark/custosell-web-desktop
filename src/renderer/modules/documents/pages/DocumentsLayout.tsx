import { Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../../app/store/hooks/useApp';

export default function DocumentsLayout() {
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const isPersonal = user?.account_type === 'personal';
  const inCabinetExplorer = /^\/documents\/cabinets\/\d+/.test(location.pathname);

  if (inCabinetExplorer) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isPersonal ? 'Documents' : 'Business files'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isPersonal
            ? 'Organize documents in cabinets - each with its own folders and tags.'
            : 'Organize company documents in cabinets - each with its own folders, access rules, and workspace.'}
        </p>
      </div>

      <div className="pb-6">
        <Outlet />
      </div>
    </div>
  );
}
