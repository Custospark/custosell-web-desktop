import type { SpotRect } from './tourCardPlacement';

const PAD = 3;
const MIN_SIDE = 28;

function isVisiblyRendered(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  // Must intersect the viewport at least a little (off-canvas drawers still count when open)
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw;
}

/** Prefer the most on-screen match when duplicates exist. */
export function resolveTourTargetEl(target: string): HTMLElement | null {
  const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(target)
    : target.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const nodes = Array.from(
    document.querySelectorAll(`[data-tour="${escaped}"]`),
  ) as HTMLElement[];
  if (nodes.length === 0) return null;

  const visible = nodes.filter(isVisiblyRendered);
  const pool = visible.length > 0 ? visible : nodes;
  if (pool.length === 1) return pool[0];

  // Nested duplicates: prefer the tightest control that still looks interactive
  let best = pool[0];
  let bestArea = Number.POSITIVE_INFINITY;
  for (const el of pool) {
    const r = el.getBoundingClientRect();
    if (r.width < 20 || r.height < 18) continue;
    const area = r.width * r.height;
    if (area < bestArea) {
      best = el;
      bestArea = area;
    }
  }
  return best;
}

function rectToSpot(rect: DOMRect): SpotRect {
  // Expand symmetrically so min-size never shifts the spotlight off-center
  let width = rect.width + PAD * 2;
  let height = rect.height + PAD * 2;
  let left = rect.left - PAD;
  let top = rect.top - PAD;

  if (width < MIN_SIDE) {
    const extra = MIN_SIDE - width;
    left -= extra / 2;
    width = MIN_SIDE;
  }
  if (height < MIN_SIDE) {
    const extra = MIN_SIDE - height;
    top -= extra / 2;
    height = MIN_SIDE;
  }

  // Sub-pixel rounding that stays centered on the true midpoints
  const right = left + width;
  const bottom = top + height;
  const leftR = Math.round(left);
  const topR = Math.round(top);
  const rightR = Math.round(right);
  const bottomR = Math.round(bottom);

  return {
    top: topR,
    left: leftR,
    width: Math.max(1, rightR - leftR),
    height: Math.max(1, bottomR - topR),
  };
}

/**
 * Measure a tour target precisely.
 * Uses instant scroll (smooth scroll would measure mid-animation and drift).
 */
export function measureTourTarget(target: string): SpotRect | null {
  const el = resolveTourTargetEl(target);
  if (!el) return null;

  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 && rect.height < 1) return null;
  return rectToSpot(rect);
}

function waitFrames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Measure after layout/transition settle. Retries until the rect stabilizes
 * (sidebar expand, route change, etc.) so the spotlight lands exactly on target.
 */
export async function measureTourTargetStable(
  target: string,
  opts?: { attempts?: number; settleMs?: number },
): Promise<SpotRect | null> {
  const attempts = opts?.attempts ?? 10;
  const settleMs = opts?.settleMs ?? 40;
  let last: SpotRect | null = null;
  let stableHits = 0;

  for (let i = 0; i < attempts; i++) {
    await waitFrames(2);
    const spot = measureTourTarget(target);
    if (spot) {
      if (
        last
        && Math.abs(spot.top - last.top) <= 1
        && Math.abs(spot.left - last.left) <= 1
        && Math.abs(spot.width - last.width) <= 1
        && Math.abs(spot.height - last.height) <= 1
      ) {
        stableHits += 1;
        if (stableHits >= 2) return spot;
      } else {
        stableHits = 0;
      }
      last = spot;
    }
    await new Promise((r) => setTimeout(r, settleMs + i * 25));
  }

  return last ?? measureTourTarget(target);
}
