import { useAppContext } from '../../../app/contexts/AppContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Main } from './Main';
import { Footer } from './Footer';
import { OfflineBanner } from '../Errors/OfflineBanner';
import { AuthPendingBanner } from '../Errors/AuthPendingBanner';
import { SyncProgressBanner } from '../Errors/SyncProgressBanner';

export function Layout() {
  const { state, dispatch } = useAppContext();
  const collapsed = state.sidebarCollapsed;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50/30">
      <AuthPendingBanner />
      <OfflineBanner />
      <SyncProgressBanner />

      <div className="flex flex-1 min-h-0">
        {state.sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            aria-hidden
          />
        )}

        <Sidebar
          isOpen={state.sidebarOpen}
          onClose={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        />

        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-200 ${
            collapsed ? 'lg:ml-[64px]' : 'lg:ml-[247px]'
          }`}
        >
          <Navbar />
          <Main />
          <Footer />
        </div>
      </div>
    </div>
  );
}
