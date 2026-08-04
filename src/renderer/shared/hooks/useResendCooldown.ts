import { useCallback, useEffect, useState } from 'react';

const DEFAULT_SECONDS = 60;

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function readCooldownUntil(storageKey: string | undefined, identifier: string): number | null {
  if (!storageKey || !identifier.trim()) return null;

  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { identifier?: string; until?: number };
    if (!parsed.identifier || typeof parsed.until !== 'number') return null;
    if (parsed.identifier !== normalizeIdentifier(identifier)) return null;

    return parsed.until;
  } catch {
    return null;
  }
}

function writeCooldown(storageKey: string | undefined, identifier: string, until: number): void {
  if (!storageKey) return;
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({ identifier: normalizeIdentifier(identifier), until }),
  );
}

export function formatResendCooldown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

interface UseResendCooldownOptions {
  /** Cooldown length in seconds. Defaults to 60. */
  seconds?: number;
  /** When provided, the cooldown survives remounts via sessionStorage. */
  storageKey?: string;
}

export function useResendCooldown(identifier: string, options: UseResendCooldownOptions = {}) {
  const { seconds = DEFAULT_SECONDS, storageKey } = options;
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const until = readCooldownUntil(storageKey, identifier);
      if (!until) {
        setSecondsLeft(0);
        return;
      }

      const remaining = Math.ceil((until - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, remaining));
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [identifier, storageKey]);

  const startCooldown = useCallback(() => {
    if (!identifier.trim()) return;
    writeCooldown(storageKey, identifier, Date.now() + seconds * 1000);
    setSecondsLeft(seconds);
  }, [identifier, storageKey, seconds]);

  return {
    secondsLeft,
    isOnCooldown: secondsLeft > 0,
    startCooldown,
    cooldownLabel: formatResendCooldown(secondsLeft),
  };
}
