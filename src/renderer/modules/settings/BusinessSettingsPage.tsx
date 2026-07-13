import BusinessSettingsForm from './ui/BusinessSettingsForm';
import { BusinessSupplyProfileCard } from '../inventory/ui/supply/BusinessSupplyProfileCard';
import { BusinessStorefrontCard } from '../inventory/ui/storefront/BusinessStorefrontCard';

/**
 * Settings → Business: profile form, then sales-channel cards (B2B supply + public shop).
 * Stacked on phone/tablet; two columns from lg+.
 */
export default function BusinessSettingsPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 px-0 pb-10 sm:space-y-8 sm:pb-8">
      <BusinessSettingsForm />

      <section aria-labelledby="business-channels-heading" className="min-w-0 space-y-3 sm:space-y-4">
        <div className="min-w-0 px-0.5">
          <h2
            id="business-channels-heading"
            className="text-base font-semibold text-gray-900 sm:text-lg"
          >
            Sales channels
          </h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-gray-600">
            Control how other businesses and customers find and order from you. Each channel saves on its own.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="flex min-w-0 flex-col [&>section]:flex-1">
            <BusinessSupplyProfileCard />
          </div>
          <div className="flex min-w-0 flex-col [&>section]:flex-1">
            <BusinessStorefrontCard />
          </div>
        </div>
      </section>
    </div>
  );
}
