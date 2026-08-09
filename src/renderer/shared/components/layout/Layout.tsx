import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Main } from './Main';
import { Footer } from './Footer';
import { AppMobileTabBar } from './AppMobileTabBar';
import { OnboardingGate } from '../../../modules/onboarding/OnboardingGate';

export function Layout() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = state.sidebarCollapsed;
  const user = useAppSelector((s) => s.auth.user);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const subscription = user?.business?.subscription;

  useEffect(() => {
    if (!isAuthenticated || location.pathname === ROUTES.ONBOARDING) return;
    if (!subscription) return;
    if (subscription.onboarding_fee_paid) return;
    navigate(ROUTES.ONBOARDING, { replace: true });
  }, [isAuthenticated, subscription, location.pathname, navigate]);

  // Immersive POS mode is scoped to the cashier page — leaving it exits fullscreen.
  useEffect(() => {
    if (state.posFullscreen && location.pathname !== ROUTES.SALES.NEW) {
      dispatch({ type: 'SET_POS_FULLSCREEN', payload: false });
    }
  }, [state.posFullscreen, location.pathname, dispatch]);

  // Immersive POS mode hides all app chrome so the cashier gets maximum screen space.
  if (state.posFullscreen) {
    return (
      <div className="relative flex flex-1 min-h-0 min-w-0 w-full overflow-hidden">
        <main className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    );
  }

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
        {/* In-flow (not fixed) so Main content is never covered */}
        <AppMobileTabBar />
      </div>
      <OnboardingGate />
    </div>
  );
}
