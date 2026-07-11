/** Viewport-aware tour card placement with a caret aimed at the spotlight. */

export interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type PlacementSide = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface CardPlacement {
  top: number;
  left: number;
  width: number;
  side: PlacementSide;
  /** Distance along the pointed edge from the near corner to the caret center. */
  caretAlong: number;
}

const EDGE_PAD = 12;
const GAP = 14;
const CARET = 10;
const MIN_CARD_W = 280;
const MAX_CARD_W = 360;

function viewportSize(): { vw: number; vh: number } {
  const vv = window.visualViewport;
  return {
    vw: Math.round(vv?.width ?? window.innerWidth),
    vh: Math.round(vv?.height ?? window.innerHeight),
  };
}

export function cardWidthForViewport(): number {
  const { vw } = viewportSize();
  if (vw < 400) return Math.max(MIN_CARD_W - 40, vw - EDGE_PAD * 2);
  if (vw < 640) return Math.min(MAX_CARD_W, vw - EDGE_PAD * 2);
  return Math.min(MAX_CARD_W, vw - EDGE_PAD * 2);
}

function estimateCardHeight(width: number, compact: boolean): number {
  // Body + header + actions; slightly taller on narrow wraps
  if (compact || width < 320) return 248;
  return 220;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function spotCenter(spot: SpotRect): { x: number; y: number } {
  return { x: spot.left + spot.width / 2, y: spot.top + spot.height / 2 };
}

function overlapsSpot(top: number, left: number, w: number, h: number, spot: SpotRect, pad = 8): boolean {
  return (
    left < spot.left + spot.width + pad
    && left + w > spot.left - pad
    && top < spot.top + spot.height + pad
    && top + h > spot.top - pad
  );
}

interface Candidate {
  side: PlacementSide;
  top: number;
  left: number;
  score: number;
}

/**
 * Place the tour card next to the spotlight and return caret alignment
 * so the card visually points at the target on all viewport sizes.
 */
export function placeTourCard(spot: SpotRect | null, measuredHeight?: number): CardPlacement {
  const { vw, vh } = viewportSize();
  const width = cardWidthForViewport();
  const compact = vw < 640;
  const height = measuredHeight && measuredHeight > 40
    ? measuredHeight
    : estimateCardHeight(width, compact);

  if (!spot) {
    return {
      top: Math.max(EDGE_PAD, vh - height - EDGE_PAD - 16),
      left: Math.round((vw - width) / 2),
      width,
      side: 'center',
      caretAlong: width / 2,
    };
  }

  const c = spotCenter(spot);
  const spaceBelow = vh - (spot.top + spot.height) - EDGE_PAD;
  const spaceAbove = spot.top - EDGE_PAD;
  const spaceRight = vw - (spot.left + spot.width) - EDGE_PAD;
  const spaceLeft = spot.left - EDGE_PAD;

  // Prefer below / above on phones (full-width feel); sides on wide screens when roomy
  const preferVertical = compact || vw < 900;

  const candidates: Candidate[] = [];

  // Below spotlight — caret on top edge, pointing up
  {
    const top = spot.top + spot.height + GAP + CARET;
    const left = clamp(c.x - width / 2, EDGE_PAD, vw - width - EDGE_PAD);
    let score = spaceBelow >= height + GAP + CARET ? 50 : 10;
    if (preferVertical) score += 15;
    if (overlapsSpot(top, left, width, height, spot)) score -= 40;
    candidates.push({ side: 'bottom', top, left, score });
  }

  // Above spotlight — caret on bottom edge, pointing down
  {
    const top = spot.top - height - GAP - CARET;
    const left = clamp(c.x - width / 2, EDGE_PAD, vw - width - EDGE_PAD);
    let score = spaceAbove >= height + GAP + CARET ? 45 : 8;
    if (preferVertical) score += 12;
    if (overlapsSpot(top, left, width, height, spot)) score -= 40;
    candidates.push({ side: 'top', top, left, score });
  }

  // Right of spotlight — caret on left edge, pointing left
  if (!preferVertical || spaceRight > width + GAP) {
    const left = spot.left + spot.width + GAP + CARET;
    const top = clamp(c.y - height / 2, EDGE_PAD, vh - height - EDGE_PAD);
    let score = spaceRight >= width + GAP + CARET ? 40 : 6;
    if (!preferVertical) score += 10;
    if (overlapsSpot(top, left, width, height, spot)) score -= 40;
    candidates.push({ side: 'right', top, left, score });
  }

  // Left of spotlight — caret on right edge, pointing right
  if (!preferVertical || spaceLeft > width + GAP) {
    const left = spot.left - width - GAP - CARET;
    const top = clamp(c.y - height / 2, EDGE_PAD, vh - height - EDGE_PAD);
    let score = spaceLeft >= width + GAP + CARET ? 35 : 5;
    if (!preferVertical) score += 8;
    if (overlapsSpot(top, left, width, height, spot)) score -= 40;
    candidates.push({ side: 'left', top, left, score });
  }

  // Safe fallback: dock to bottom center (common on tiny screens when spot is mid-navbar)
  candidates.push({
    side: 'bottom',
    top: vh - height - EDGE_PAD - 8,
    left: Math.round((vw - width) / 2),
    score: 1,
  });

  const best = candidates
    .map((cand) => ({
      ...cand,
      top: clamp(cand.top, EDGE_PAD, Math.max(EDGE_PAD, vh - height - EDGE_PAD)),
      left: clamp(cand.left, EDGE_PAD, Math.max(EDGE_PAD, vw - width - EDGE_PAD)),
    }))
    .sort((a, b) => b.score - a.score)[0];

  let caretAlong: number;
  if (best.side === 'bottom' || best.side === 'top') {
    caretAlong = clamp(c.x - best.left, 18, width - 18);
  } else if (best.side === 'left' || best.side === 'right') {
    caretAlong = clamp(c.y - best.top, 18, height - 18);
  } else {
    caretAlong = width / 2;
  }

  return {
    top: Math.round(best.top),
    left: Math.round(best.left),
    width: Math.round(width),
    side: best.side,
    caretAlong: Math.round(caretAlong),
  };
}

export { CARET as TOUR_CARET_SIZE };
