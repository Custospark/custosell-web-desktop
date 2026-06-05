import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Home, CreditCard, Shield } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { useToast } from '../../app/contexts/ToastContext';
import LogoImage from '../../shared/assets/LogoImage';

const navLinks = [
  { label: 'Home', path: ROUTES.HOME, icon: Home },
  { label: 'Pricing', path: ROUTES.PRICING, icon: CreditCard },
  { label: 'Privacy', path: ROUTES.PRIVACY, icon: Shield },
];

export default function LandingLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const handleAction = (action: 'login' | 'signup') => {
    navigate(action === 'login' ? ROUTES.LOGIN : ROUTES.REGISTER);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = 'https://github.com/Custospark/custosell-web-desktop/releases/download/v1.0.0/Custosell-Setup-1.0.0.exe';
    link.download = 'Custosell-Setup-1.0.0.exe';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Custosell Desktop download started...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white flex flex-col">
      <header className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-slate-200/60 transition-all duration-300">
        <nav className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4" aria-label="Main navigation">
          <div className="flex items-center justify-between">
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="flex items-center gap-3">
              <Link to={ROUTES.HOME}>
                <LogoImage size="sm" />
              </Link>
              <Link to={ROUTES.HOME} className="text-lg font-bold text-blue-600">Custosell</Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="flex items-center gap-1 sm:gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-2 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 inline-flex items-center gap-1.5 ${
                      location.pathname === link.path
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{link.label}</span>
                  </Link>
                );
              })}

              <div className="w-px h-6 mx-1 sm:mx-2 bg-slate-300/50" />

              <button
                onClick={handleDownload}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl font-bold text-xs transition-all duration-300 border-2 shadow-sm bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 cursor-pointer"
                aria-label="Download Windows version"
                title="Download Custosell for Windows"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Windows</span>
              </button>

              <button
                onClick={() => handleAction('login')}
                className="px-2 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                Sign In
              </button>
            </motion.div>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-blue-50/30 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <LogoImage size="sm" />
              <span className="text-base font-bold text-blue-600">Custosell</span>
            </div>
            <p className="text-sm text-gray-500 text-center md:text-right">
              Custosell is a product of{' '}
              <a href="https://www.custospark.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Custospark Company Ltd</a>
            </p>
          </div>
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-gray-400">Faster Sales. Smarter Business. &mdash; Point of Sale for every business.</span>
            <a href="/register" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">Start Free Trial →</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
