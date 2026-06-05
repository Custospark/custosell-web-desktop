import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { useToast } from '../../app/contexts/ToastContext';
import LogoImage from '../../shared/assets/LogoImage';

const navLinks = [
  { label: 'Home', path: ROUTES.HOME },
  { label: 'Pricing', path: ROUTES.PRICING },
  { label: 'Privacy', path: ROUTES.PRIVACY },
];

export default function LandingLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: 'login' | 'signup') => {
    setIsLoading(action);
    await new Promise((resolve) => setTimeout(resolve, 400));
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
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <LogoImage size="sm" />
              <span className="text-lg font-bold text-blue-600">Custosell</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14V9h2v7h-2zm0-9V5h2v2h-2z"/></svg>
                Windows App
              </Button>
              <Button variant="ghost" onClick={() => handleAction('login')}>Sign In</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-8">
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
          <div className="border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            Faster Sales. Smarter Business. &mdash; Point of Sale for every business.
          </div>
        </div>
      </footer>
    </div>
  );
}
