const OFFLINE_BANNER_DISMISSED_KEY = 'custosell_offline_banner_dismissed';

export function isOfflineBannerDismissed(): boolean {
  try {
    return localStorage.getItem(OFFLINE_BANNER_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function persistOfflineBannerDismissed(): void {
  try {
    localStorage.setItem(OFFLINE_BANNER_DISMISSED_KEY, 'true');
  } catch {
    // storage unavailable
  }
}
