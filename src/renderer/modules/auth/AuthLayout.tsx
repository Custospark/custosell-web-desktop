import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Home } from 'lucide-react';
import LogoImage from '../../shared/assets/LogoImage';

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

export function AuthLayout({ title, subtitle, heroImage, heroDescription, children }: PropsWithChildren<AuthLayoutProps>) {
  const image = heroImage || HERO_IMAGES.login;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-black/70" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <span className="text-white text-2xl font-bold tracking-tight">Custosell</span>
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
              Faster Sales. Smarter Business.
            </h1>
            <p className="text-blue-200 text-base leading-relaxed">
              {heroDescription || 'A complete POS system for retail and wholesale businesses.'}
            </p>
            <div className="mt-6 flex gap-4">
              {[
                { value: '10K+', label: 'Businesses' },
                { value: '99%', label: 'Uptime' },
                { value: 'Offline', label: 'First' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-white min-w-[90px] text-center">
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-blue-200 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-blue-300 text-sm">
            &copy; {new Date().getFullYear()} Custospark. All rights reserved.
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 bg-white">
          <LogoImage size="md" />
          <span className="text-xl font-bold text-blue-600">Custosell</span>
          <div className="ml-auto">
            <Link to={ROUTES.HOME} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
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
