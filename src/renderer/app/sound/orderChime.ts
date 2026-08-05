/**
 * Generic notification chime engine — Web Audio API synth (no audio files).
 *
 * Exposes a small, framework-free API so any caller (React hooks, polling
 * effects, imperative listeners) can play the order chime. The engine keeps a
 * single shared AudioContext, respects a global mute flag, and only resumes
 * once the browser/Electron window has an unlocked audio context.
 *
 * Kept deliberately small/generic: new sound types can be added here without
 * touching call sites.
 */

const ORDER_CHIME_FREQ = 880;
const STATUS_CHIME_FREQ = 660;
const BIG_ORDER_FREQ = 990;
const PREVIEW_FREQ = 660;

/** How an order-status change should *sound* — a bright finish for good news,
 *  a flatter one for cancellations, neutral otherwise. */
const STATUS_TONES: Record<string, readonly number[]> = {
  completed: [880, 1046],
  invoiced: [660, 880],
  cancelled: [440, 392],
  open: [660],
};

let sharedCtx: AudioContext | null = null;
let muted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/** Resume the shared context on the first explicit user gesture. Safe to call repeatedly. */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'running') return;
  void ctx.resume().catch(() => undefined);
}

/** Global mute switch — driven by the persisted preference. */
export function setSoundMuted(next: boolean): void {
  muted = next;
}

export function isSoundMuted(): boolean {
  return muted;
}

/**
 * Play a short synthesized chime `times` times (spaced apart).
 * Adopts a soft pluck so it never startles — polite background alert.
 */
export function playChime(times: number, freq = ORDER_CHIME_FREQ): void {
  if (muted || times < 1) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);

  const now = ctx.currentTime;
  for (let i = 0; i < times; i++) {
    const t0 = now + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.32);
  }
}

/** Play a short sequence of notes (frequencies in Hz), each a soft pluck. */
function playToneSequence(freqs: readonly number[]): void {
  if (muted || freqs.length === 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);

  const now = ctx.currentTime;
  freqs.forEach((freq, i) => {
    const t0 = now + i * 0.16;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.32);
  });
}

/** Two chimes — a new online order has arrived. */
export function playNewOrderChime(): void {
  playChime(2, ORDER_CHIME_FREQ);
}

/** Single lower chime — an existing order changed status.
 *  The tone varies by status so you can tell the outcome without looking. */
export function playStatusChime(status?: string): void {
  const tones = STATUS_TONES[status ?? ''];
  if (tones) playToneSequence(tones);
  else playChime(1, STATUS_CHIME_FREQ);
}

/** Three rising chimes — a new order that clears the big-order bar. */
export function playBigOrderChime(): void {
  playChime(3, BIG_ORDER_FREQ);
}

/** One gentle two-note preview — plays regardless of the mute flag so a user
 *  can audition the sound before enabling it. */
export function playPreviewChime(): void {
  if (muted) {
    const wasMuted = muted;
    muted = false;
    playToneSequence([PREVIEW_FREQ, PREVIEW_FREQ * 1.333]);
    muted = wasMuted;
  } else {
    playToneSequence([PREVIEW_FREQ, PREVIEW_FREQ * 1.333]);
  }
}