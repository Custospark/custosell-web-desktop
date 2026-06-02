import { Outlet } from 'react-router-dom';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { Sidebar } from './Sidebar';
import { Menu, X } from 'lucide-react';

export function Layout() {
  const { state, dispatch } = useAppContext();
  const user = useAppSelector((s) => s.auth.user);
  const collapsed = state.sidebarCollapsed;

  return (
    <div className="flex h-screen bg-gray-50">
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

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${collapsed ? 'lg:ml-[64px]' : 'lg:ml-[260px]'}`}>
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button
            className="lg:hidden text-gray-600 hover:text-gray-900"
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          >
            {state.sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500" title="Online" />
            <span>{user?.name || 'User'}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
