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

  // Immersive content mode is scoped to the cashier page and pipeline/estimates
  // board detail pages — leaving those routes exits fullscreen.
  useEffect(() => {
    const onImmersiveRoute =
      location.pathname === ROUTES.SALES.NEW ||
      location.pathname.startsWith(`${ROUTES.PIPELINE.BOARDS}/`) ||
      location.pathname.startsWith(`${ROUTES.ESTIMATES.BOARDS}/`);
    if (state.contentFullscreen && !onImmersiveRoute) {
      dispatch({ type: 'SET_CONTENT_FULLSCREEN', payload: false });
    }
  }, [state.contentFullscreen, location.pathname, dispatch]);

  // Immersive content mode hides all app chrome so the content gets maximum screen space.
  if (state.contentFullscreen) {
    return (
      <div className="relative flex flex-1 min-h-0 min-w-0 w-full overflow-hidden">
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-4 sm:p-6">
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
