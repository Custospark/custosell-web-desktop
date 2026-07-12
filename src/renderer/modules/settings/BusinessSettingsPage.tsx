import BusinessSettingsForm from './ui/BusinessSettingsForm';
import { BusinessStorefrontCard } from '../inventory/ui/storefront/BusinessStorefrontCard';

export default function BusinessSettingsPage() {
  return (
    <div className="space-y-6">
      <BusinessSettingsForm />
      <BusinessStorefrontCard />
    </div>
  );
}
