import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useLogout } from '../../../shared/api/account/AccountQueries';
import { useConfirm } from '../Feedback/ConfirmContext';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Sidebar } from './Sidebar';
import { Menu, X, User, LogOut, ChevronDown, Clock } from 'lucide-react';
import { formatShiftDateTime } from '../../utils/formatDateTime';

export function Layout() {
  const { state, dispatch } = useAppContext();
  const user = useAppSelector((s) => s.auth.user);
  const collapsed = state.sidebarCollapsed;
  const navigate = useNavigate();
  const logoutMutation = useLogout();
  const { confirm } = useConfirm();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    const msg = user?.shift_clock_in
      ? `${user?.name || 'User'}, your shift will remain active. You can resume when you log back in.`
      : `${user?.name || 'User'}, are you sure you want to logout?`;
    const confirmed = await confirm({
      title: 'Logout',
      message: msg,
      confirmText: 'Logout',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;
    setDropdownOpen(false);
    logoutMutation.mutate();
  };

  return (
    <div className="flex h-screen bg-gray-50/30">
      {state.sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        />
      )}

      <Sidebar
        isOpen={state.sidebarOpen}
        onClose={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${collapsed ? 'lg:ml-[64px]' : 'lg:ml-[247px]'}`}>
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            className="lg:hidden text-gray-600 hover:text-gray-900 shrink-0"
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          >
            {state.sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {user?.shift_clock_in && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline font-semibold text-gray-900">Shift Started :</span>
               <span className="font-medium text-blue-600">{formatShiftDateTime(user.shift_clock_in)}</span>
            </div>
          )}

          <div className="flex-1 flex justify-center min-w-0">
            {user?.business_name && (
              <span className="text-sm font-semibold text-gray-700 truncate">{user.business_name}</span>
            )}
          </div>

          <div ref={dropdownRef} className="relative shrink-0">
            <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium hidden sm:inline">{user?.name || 'User'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                  {user?.email && <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>}
                </div>
                <button type="button" onClick={() => { setDropdownOpen(false); navigate(ROUTES.SETTINGS.PROFILE); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                {user?.shift_clock_in && (
                  <>
                    <hr className="border-gray-100" />
                    <button type="button" onClick={() => { setDropdownOpen(false); navigate(ROUTES.SALES.MY_SHIFT, { state: { openEndShift: true } }); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                      <LogOut className="w-4 h-4" />
                      End Shift
                    </button>
                  </>
                )}
                <hr className="border-gray-100" />
                <button type="button" onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" />
                  {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
        <footer className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between text-xs">
          <span className="text-gray-500">
            <span className="font-semibold text-blue-600">Custosell</span> &mdash; Sell More. Track All. Grow Fast.
          </span>
          <span className="text-blue-600">
            Custosell is a product of <a href="https://www.custospark.com" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-blue-800">Custospark Company Ltd.</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
