import { BusinessSupplyProfileCard } from '../inventory/ui/supply/BusinessSupplyProfileCard';
import { BusinessStorefrontCard } from '../inventory/ui/storefront/BusinessStorefrontCard';

/**
 * Settings → Sales channels: B2B supply marketplace + public shop.
 */
export default function SalesChannelsSettingsPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 pb-10 sm:space-y-8 sm:pb-8">
      <header className="min-w-0 px-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Settings</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">Sales channels</h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-gray-600">
          Control how other businesses and customers find and order from you. Each channel saves on its own.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-w-0 flex-col [&>section]:flex-1">
          <BusinessSupplyProfileCard />
        </div>
        <div className="flex min-w-0 flex-col [&>section]:flex-1">
          <BusinessStorefrontCard />
        </div>
      </div>
    </div>
  );
}
