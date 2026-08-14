import { getUserFirstName } from '../../utils/userDisplayName';

/** Reassuring offline banner - keep working; work is saved locally. */
export function buildOfflineBannerHeadline(name: string | null | undefined): string {
  const firstName = getUserFirstName(name, '');
  return firstName ? `${firstName}, you can keep working` : 'You can keep working offline';
}

export const OFFLINE_BANNER_REASSURANCE =
  'Your sales and other changes are saved on this device - we will sync everything when you are back online.';
