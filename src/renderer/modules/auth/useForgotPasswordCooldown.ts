import { useCallback, useEffect, useState } from 'react';

const COOLDOWN_MS = 60_000;
const STORAGE_KEY = 'custosell:forgot-password-cooldown';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readCooldownUntil(email: string): number | null {
  if (!email.trim()) return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { email?: string; until?: number };
    if (!parsed.email || typeof parsed.until !== 'number') return null;
    if (parsed.email !== normalizeEmail(email)) return null;

    return parsed.until;
  } catch {
    return null;
  }
}

function writeCooldown(email: string): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ email: normalizeEmail(email), until: Date.now() + COOLDOWN_MS }),
  );
}

export function formatForgotPasswordCooldown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function useForgotPasswordCooldown(email: string) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const until = readCooldownUntil(email);
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
  }, [email]);

  const startCooldown = useCallback(() => {
    if (!email.trim()) return;
    writeCooldown(email);
    setSecondsLeft(Math.ceil(COOLDOWN_MS / 1000));
  }, [email]);

  return {
    secondsLeft,
    isOnCooldown: secondsLeft > 0,
    startCooldown,
    cooldownLabel: formatForgotPasswordCooldown(secondsLeft),
  };
}
