import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { Recommendation } from '../api/AccountingTypes';
import { cn } from '../../../shared/utils/cn';
import { formatRatioValue, getHealth, RATIO_INFO } from './ratioDefinitions';
import type { RatioDef } from './ratioTypes';
import { HealthDot } from './HealthDot';

const TOOLTIP_MAX_W = 360;
const TOOLTIP_MARGIN = 8;
const TOOLTIP_TOP_GAP = 10;

interface TipPos {
  top: number;
  left: number;
}

interface RatioLineProps {
  def: RatioDef;
  value: number | null;
  selected: boolean;
  onClick: () => void;
  recommendation?: Recommendation | null;
}

/**
 * Ratio row with a responsive info tooltip.
 * - Desktop: opens on hover (mouseenter/mouseleave with a 200ms grace delay).
 * - Mobile/touch: tapping the Info icon toggles it open; closes on outside tap,
 *   scroll, resize, or Escape.
 * - Position is clamped to the viewport after render so the panel is never cut
 *   off on small screens.
 */
export function RatioLine({ def, value, selected, onClick, recommendation }: RatioLineProps) {
  const health = getHealth(value, def);
  const formatted = value !== null ? formatRatioValue(value, def.format) : 'N/A';
  const info = RATIO_INFO[def.key];

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<TipPos>({ top: 0, left: 0 });
  const [side, setSide] = useState<'left' | 'right'>('right');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const iconColor = health === 'healthy' ? 'text-green-400' : health === 'warning' ? 'text-amber-400' : 'text-red-400';

  const positionFromTrigger = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const w = Math.min(TOOLTIP_MAX_W, vw - TOOLTIP_MARGIN * 2);
    const spaceRight = vw - rect.left;
    const isRight = spaceRight >= w;
    setSide(isRight ? 'right' : 'left');
    setPos({
      top: rect.bottom + TOOLTIP_TOP_GAP,
      left: isRight ? rect.left : rect.right - w,
    });
  }, []);

  const show = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const toggle = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    positionFromTrigger();
    setOpen(true);
  }, [open, positionFromTrigger]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (tipRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function closeOnUiChange() {
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', closeOnUiChange, true);
    window.addEventListener('resize', closeOnUiChange);
    window.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', closeOnUiChange, true);
      window.removeEventListener('resize', closeOnUiChange);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !tipRef.current) return;
    const el = tipRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(TOOLTIP_MARGIN, Math.min(pos.left, vw - w - TOOLTIP_MARGIN));
    const top = Math.max(TOOLTIP_MARGIN, Math.min(pos.top, vh - h - TOOLTIP_MARGIN));
    if (top !== pos.top || left !== pos.left) {
      setPos({ top, left });
    }
  }, [open, pos]);

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onClick}
        onMouseEnter={positionFromTrigger}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
          selected
            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <HealthDot status={health} />
          <span className="truncate">{def.label}</span>
        </div>
        <span className="font-semibold tabular-nums shrink-0">{formatted}</span>
        {info && (
          <span
            role="button"
            tabIndex={0}
            onClick={toggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(e);
              }
            }}
            className={cn('shrink-0 p-0.5 rounded hover:bg-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300', iconColor)}
            title={`About ${def.label}`}
            aria-label={`About ${def.label}`}
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && info && (
        <div
          ref={tipRef}
          className="fixed z-[9999] w-[min(360px,calc(100vw-1rem))] bg-white rounded-xl shadow-xl border border-blue-200 p-4 text-sm leading-relaxed space-y-2.5"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className={cn('absolute -top-2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-blue-200', side === 'right' ? 'left-4' : 'right-4')} />
          <div className={cn('absolute -top-[7px] w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white', side === 'right' ? 'left-4' : 'right-4')} />

          <p className="text-sm font-bold text-gray-900">{info.fullName}</p>
          <p className="text-xs text-gray-600 leading-relaxed">{info.meaning}</p>
          <div className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 border border-gray-100">{info.formula}</div>
          <p className="text-xs text-gray-500">{info.importance}</p>
          {value === null && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">Insufficient data — this ratio cannot be calculated until relevant accounts have transactions.</p>
          )}
          {recommendation && (
            <div className={cn(
              'rounded-lg px-3 py-2 text-xs border',
              recommendation.priority === 'high' ? 'bg-red-50 border-red-100 text-red-700' :
              recommendation.priority === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-700' :
              'bg-green-50 border-green-100 text-green-700',
            )}>
              <p className="font-semibold mb-0.5">Recommendation</p>
              <p>{recommendation.message}</p>
              <p className="mt-1 italic">{recommendation.action}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
