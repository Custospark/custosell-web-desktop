import { useMemo } from 'react';
import { LogIn, LogOut, ShieldCheck, Mail, KeyRound, ShieldAlert, History } from 'lucide-react';
import { useAccountActivity } from '../../../shared/api/account/SecurityQueries';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { cn } from '../../../shared/utils/cn';

const ACTION_META: Record<string, { label: string; cls: string }> = {
  login: { label: 'Signed in', cls: 'text-blue-600 bg-blue-50 border-blue-100' },
  logout: { label: 'Signed out', cls: 'text-gray-600 bg-gray-100 border-gray-200' },
  email_verified: { label: 'Email verified', cls: 'text-green-600 bg-green-50 border-green-100' },
  two_factor_challenge: { label: '2FA code sent', cls: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  two_factor_passed: { label: '2FA verified', cls: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  two_factor_enabled: { label: '2FA enabled', cls: 'text-green-600 bg-green-50 border-green-100' },
  two_factor_disabled: { label: '2FA disabled', cls: 'text-amber-600 bg-amber-50 border-amber-100' },
  password_changed: { label: 'Password changed', cls: 'text-amber-600 bg-amber-50 border-amber-100' },
};

function actionIcon(action: string) {
  const icons: Record<string, typeof LogIn> = {
    login: LogIn,
    logout: LogOut,
    email_verified: Mail,
    two_factor_challenge: ShieldCheck,
    two_factor_passed: ShieldCheck,
    two_factor_enabled: ShieldCheck,
    two_factor_disabled: ShieldAlert,
    password_changed: KeyRound,
  };
  return icons[action] ?? History;
}

function whenLabel(at: string): string {
  const d = new Date(at);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SecurityActivityTab() {
  const { data: feed, isLoading } = useAccountActivity();
  const items = useMemo(() => feed ?? [], [feed]);
  const paginated = usePagination(items, 12);
  const userAgent = items[0]?.user_agent;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Account Activity</h3>
        <p className="text-xs text-gray-500 mt-0.5">Sign-ins, sign-outs, verification, and password changes — newest first.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <CustosellLoader fullPage={false} />
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="relative pl-8 space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {paginated.data.map((item) => {
              const meta = ACTION_META[item.action] ?? { label: item.action.replace(/_/g, ' '), cls: 'text-blue-600 bg-blue-50 border-blue-100' };
              const Icon = actionIcon(item.action);
              return (
                <div key={item.id} className="relative">
                  <div className={cn('absolute -left-8 top-0 w-6 h-6 rounded-full border flex items-center justify-center', meta.cls)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {whenLabel(item.at)}
                        {item.ip_address ? <span className="text-gray-400"> · {item.ip_address}</span> : null}
                      </p>
                    </div>
                    {(item.action === 'login' || item.action === 'two_factor_passed' || item.action === 'email_verified') && (
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                        Secured
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {items.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={paginated.page}
                totalPages={paginated.totalPages}
                totalItems={paginated.totalItems}
                pageSize={paginated.pageSize}
                onPageChange={paginated.setPage}
                onPageSizeChange={paginated.setPageSize}
              />
            </div>
          )}
          {userAgent ? (
            <p className="mt-4 text-[11px] text-gray-400">Most recent device: {userAgent}</p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">No account activity recorded yet.</p>
      )}
    </div>
  );
}