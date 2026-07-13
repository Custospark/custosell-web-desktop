import BusinessSettingsForm from './ui/BusinessSettingsForm';

/**
 * Settings → Business: profile, tax contact, payments, receipts.
 * Sales channels live under Settings → Sales channels.
 */
export default function BusinessSettingsPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl pb-10 sm:pb-8">
      <BusinessSettingsForm />
    </div>
  );
}
