import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PricingPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-center space-y-6">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full shadow-lg shadow-blue-500/20">
        <Sparkles className="w-4 h-4 text-white" />
        <span className="text-sm font-semibold text-white">Coming Soon</span>
      </div>
      <h1 className="text-4xl font-bold text-gray-900">Pricing</h1>
      <p className="text-lg text-gray-500 max-w-xl mx-auto">We're putting the finishing touches on our pricing plans. Sign up for early access and enjoy special launch pricing.</p>
      <Button size="lg" onClick={() => navigate(ROUTES.REGISTER)}>
        Get Early Access
      </Button>
    </div>
  );
}
