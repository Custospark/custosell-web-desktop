import { AuthPendingBanner } from '../Errors/AuthPendingBanner';
import { OfflineBanner } from '../Errors/OfflineBanner';
import { SyncProgressBanner } from '../Errors/SyncProgressBanner';

/** Global status strips — rendered above the app shell so navbar/sidebar chrome stays aligned. */
export function AppStatusBanners() {
  return (
    <>
      <AuthPendingBanner />
      <OfflineBanner />
      <SyncProgressBanner />
    </>
  );
}
