import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
}

const TAGLINE = 'Simple Sales. Smarter Business.';
const HERO_IMAGE = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80';

export function AuthLayout({ title, subtitle, children }: PropsWithChildren<AuthLayoutProps>) {
  return (
    <div className="min-h-screen flex">
      {/* Left: Hero section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={HERO_IMAGE} alt="POS System" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-indigo-900/80 to-black/70" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to={ROUTES.DASHBOARD} className="text-white text-2xl font-bold tracking-tight">
            Custosell
          </Link>
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              {TAGLINE}
            </h1>
            <p className="text-blue-200 text-lg">
              Sales, inventory, expenses, and reporting — all working offline.
              No internet connection required for daily operations.
            </p>
            <div className="mt-8 flex gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-white">
                <div className="text-2xl font-bold">3</div>
                <div className="text-blue-200 text-sm">Plans</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-white">
                <div className="text-2xl font-bold">14</div>
                <div className="text-blue-200 text-sm">Modules</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-white">
                <div className="text-2xl font-bold">121</div>
                <div className="text-blue-200 text-sm">Tests</div>
              </div>
            </div>
          </div>
          <div className="text-blue-300 text-sm">
            &copy; {new Date().getFullYear()} Custosell. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right: Form section */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Custosell</h1>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
          {subtitle && <p className="text-gray-500 mb-8">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
