import BusinessSettingsForm from './ui/BusinessSettingsForm';
import { BusinessSupplyProfileCard } from '../inventory/ui/supply/BusinessSupplyProfileCard';
import { BusinessStorefrontCard } from '../inventory/ui/storefront/BusinessStorefrontCard';

/**
 * Settings → Business: profile form, then sales-channel cards (B2B supply + public shop).
 */
export default function BusinessSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-8">
      <BusinessSettingsForm />

      <section aria-labelledby="business-channels-heading" className="space-y-4">
        <div className="px-0.5">
          <h2 id="business-channels-heading" className="text-lg font-semibold text-gray-900">
            Sales channels
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Control how other businesses and customers find and order from you. Each channel saves on its own.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-stretch">
          <div className="min-w-0 [&>section]:h-full">
            <BusinessSupplyProfileCard />
          </div>
          <div className="min-w-0 [&>section]:h-full">
            <BusinessStorefrontCard />
          </div>
        </div>
      </section>
    </div>
  );
}
