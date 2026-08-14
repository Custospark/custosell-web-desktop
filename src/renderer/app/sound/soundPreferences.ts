/**
 * Client-only sound preferences - persisted in localStorage.
 *
 * Following the existing per-feature storage pattern (storefrontBuyerContactStorage,
 * offlinePreferences), stored as JSON under a versioned key with safe defaults
 * so the feature is ON by default (per product decision) and degrades gracefully.
 */

export const SOUND_PREFS_KEY = 'custosell.sound.prefs.v1';

export interface SoundPreferences {
  /** Play a chime when a new online/storefront order arrives (business + buyer). */
  orderSound: boolean;
  /** Business "big-order" alert bar - any new open order with total_amount >=
   *  this plays the urgent chime instead of the normal one. null = disabled. */
  bigOrderThreshold: number | null;
}

export const DEFAULT_SOUND_PREFS: SoundPreferences = {
  orderSound: true,
  bigOrderThreshold: null,
};

export function loadSoundPreferences(): SoundPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_SOUND_PREFS };
  try {
    const raw = window.localStorage.getItem(SOUND_PREFS_KEY);
    if (!raw) return { ...DEFAULT_SOUND_PREFS };
    const parsed = JSON.parse(raw) as Partial<SoundPreferences>;
    return {
      orderSound:
        typeof parsed.orderSound === 'boolean' ? parsed.orderSound : DEFAULT_SOUND_PREFS.orderSound,
      bigOrderThreshold:
        typeof parsed.bigOrderThreshold === 'number' && parsed.bigOrderThreshold > 0
          ? parsed.bigOrderThreshold
          : DEFAULT_SOUND_PREFS.bigOrderThreshold,
    };
  } catch {
    return { ...DEFAULT_SOUND_PREFS };
  }
}

export function saveSoundPreferences(patch: Partial<SoundPreferences>): SoundPreferences {
  const next = { ...loadSoundPreferences(), ...patch };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SOUND_PREFS_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable (privacy mode) - sound defaults still apply in-memory
    }
  }
  return next;
}