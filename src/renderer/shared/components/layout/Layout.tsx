import { useAppContext } from '../../../app/contexts/AppContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Main } from './Main';
import { Footer } from './Footer';

export function Layout() {
  const { state, dispatch } = useAppContext();
  const collapsed = state.sidebarCollapsed;

  return (
    <div className="relative flex flex-1 min-h-0 min-w-0 w-full overflow-hidden">
      {state.sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          aria-hidden
        />
      )}

      <Sidebar
        isOpen={state.sidebarOpen}
        onClose={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
      />

      <div
        className={`flex flex-1 flex-col min-w-0 min-h-0 transition-all duration-200 ${
          collapsed ? 'lg:ml-[64px]' : 'lg:ml-[247px]'
        }`}
      >
        <Navbar />
        <Main />
        <Footer />
      </div>
    </div>
  );
}
