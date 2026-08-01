import { Home, CreditCard, Shield, Compass, HelpCircle, type LucideIcon } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';

export const LANDING_MOBILE_TABS: ReadonlyArray<{
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}> = [
  { label: 'Home', path: ROUTES.HOME, icon: Home, end: true },
  { label: 'Order Online', path: ROUTES.DISCOVER, icon: Compass },
  { label: 'Pricing', path: ROUTES.PRICING, icon: CreditCard },
  { label: 'Privacy', path: ROUTES.PRIVACY, icon: Shield },
  { label: 'FAQs', path: ROUTES.PUBLIC_FAQS, icon: HelpCircle },
];

export function scrollLandingToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  const root = document.getElementById('root');
  if (root) root.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
