import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Home, CreditCard, Shield, UserRound, Compass, HelpCircle } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { useToast } from '../../app/contexts/ToastContext';
import LogoImage from '../../shared/assets/LogoImage';
import { BRAND_LOCKUP, PRODUCT_NAME } from '../../shared/brand/custosellBrand';
import {
  getWindowsInstallerDownloadUrl,
  getWindowsInstallerFileName,
} from '../../shared/config/desktopRelease';
import { cn } from '../../shared/utils/cn';
import { LandingMobileTabBar } from './ui/LandingMobileTabBar';
import { scrollLandingToTop } from './ui/landingMobileNav';

const navLinks = [
  { label: 'Home', path: ROUTES.HOME, icon: Home },
  { label: 'Order Online', path: ROUTES.DISCOVER, icon: Compass },
  { label: 'Pricing', path: ROUTES.PRICING, icon: CreditCard },
  { label: 'Privacy', path: ROUTES.PRIVACY, icon: Shield },
  { label: 'FAQs', path: ROUTES.PUBLIC_FAQS, icon: HelpCircle },
] as const;

export default function LandingLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  useEffect(() => {
    scrollLandingToTop();
  }, [location.pathname]);

  const handleAction = (action: 'login' | 'signup') => {
    navigate(action === 'login' ? ROUTES.LOGIN : ROUTES.REGISTER);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getWindowsInstallerDownloadUrl();
    link.download = getWindowsInstallerFileName();
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Custosell Desktop download started...');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-blue-50/30 to-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl transition-all duration-300">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6 sm:py-4" aria-label="Main navigation">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex items-center gap-3"
          >
            <Link to={ROUTES.HOME} onClick={scrollLandingToTop}>
              <LogoImage size="sm" />
            </Link>
            <Link to={ROUTES.HOME} onClick={scrollLandingToTop} className="text-lg font-bold text-blue-600">
              {PRODUCT_NAME}
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex items-center gap-1 sm:gap-2"
          >
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={scrollLandingToTop}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300',
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              <div className="mx-2 h-6 w-px bg-slate-300/50" />
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="hidden cursor-pointer items-center gap-1.5 rounded-xl border-2 border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm transition-all duration-300 hover:border-blue-400 hover:bg-blue-100 sm:inline-flex"
              aria-label="Download Windows version"
              title="Download Custosell for Windows"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Windows</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction('login')}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900 sm:px-4"
              aria-label="Account - go to sign in"
              title="Account"
            >
              <UserRound className="h-4 w-4" />
              <span>Account</span>
            </button>
          </motion.div>
        </nav>
      </header>

      <main className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>

      <footer className="hidden border-t border-gray-200 bg-blue-50/30 py-8 md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2.5">
              <LogoImage size="sm" />
              <span className="text-base font-bold text-blue-600">{PRODUCT_NAME}</span>
            </div>
            <p className="text-center text-sm text-gray-500 md:text-right">
              {PRODUCT_NAME} is a product of{' '}
              <a
                href="https://www.custospark.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                Custospark Company Ltd
              </a>
            </p>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-6 sm:flex-row">
            <span className="text-xs text-gray-400">{BRAND_LOCKUP}</span>
            <a href="/register" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
              Create Account →
            </a>
          </div>
        </div>
      </footer>

      <LandingMobileTabBar />
    </div>
  );
}
