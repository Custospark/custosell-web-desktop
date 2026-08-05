import { useCallback, useEffect, useState } from 'react';
import { setSoundMuted } from './orderChime';
import {
  DEFAULT_SOUND_PREFS,
  loadSoundPreferences,
  saveSoundPreferences,
  type SoundPreferences,
} from './soundPreferences';

/**
 * Reactive access to sound preferences (persisted client-side).
 * Keeps the chime engine's mute flag in sync with the stored value.
 */
export function useSoundPreferences() {
  const [prefs, setPrefs] = useState<SoundPreferences>(() => loadSoundPreferences());

  useEffect(() => {
    setSoundMuted(!prefs.orderSound);
  }, [prefs.orderSound]);

  const setOrderSound = useCallback((enabled: boolean) => {
    const next = saveSoundPreferences({ orderSound: enabled });
    setPrefs(next);
  }, []);

  return {
    orderSound: prefs.orderSound,
    setOrderSound,
  };
}

export { DEFAULT_SOUND_PREFS };
