import type { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Home, CreditCard, Shield, Download, LogIn } from 'lucide-react';
import LogoImage from '../../shared/assets/LogoImage';
import { useToast } from '../../app/contexts/ToastContext';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  heroImage?: string;
  heroDescription?: string;
}

const HERO_IMAGES = {
  login: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
  register: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
};

const navLinks = [
  { label: 'Home', path: ROUTES.HOME, icon: Home },
  { label: 'Pricing', path: ROUTES.PRICING, icon: CreditCard },
  { label: 'Privacy', path: ROUTES.PRIVACY, icon: Shield },
];

export function AuthLayout({ title, subtitle, heroImage, heroDescription, children }: PropsWithChildren<AuthLayoutProps>) {
  const location = useLocation();
  const { showToast } = useToast();
  const image = heroImage || HERO_IMAGES.login;

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
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-black/70" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <span className="text-white text-2xl font-bold tracking-tight">Custosell</span>
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
              Sell More. Track All. Grow Fast.
            </h1>
            <p className="text-blue-200 text-base leading-relaxed">
              {heroDescription || 'A complete POS system for retail and wholesale businesses.'}
            </p>
            <div className="mt-6 flex gap-4">
              {[
                { value: 'Offline', label: 'First' },
                { value: '99%', label: 'Uptime' },
                { value: 'Free', label: 'Trial' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-white min-w-[90px] text-center">
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-blue-200 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-blue-300/70 text-sm">
              Custosell is a product of{' '}
              <a href="https://www.custospark.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-white underline transition-colors">Custospark Company Ltd</a>
            </p>
            <div className="text-blue-300 text-xs">
              &copy; {new Date().getFullYear()} Custospark. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 bg-white">
          <LogoImage size="md" />
          <span className="text-xl font-bold text-blue-600">Custosell</span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
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

            <Link
              to={ROUTES.LOGIN}
              className={`px-2 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 inline-flex items-center gap-1.5 ${
                location.pathname === ROUTES.LOGIN || location.pathname === ROUTES.REGISTER
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-8 sm:p-12 bg-gray-50">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-1.5 text-center">{title}</h2>
            {subtitle && <p className="text-gray-500 mb-8 text-center">{subtitle}</p>}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
