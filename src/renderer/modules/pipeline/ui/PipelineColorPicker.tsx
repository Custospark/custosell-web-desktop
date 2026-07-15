import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';
import { cn } from '../../../shared/utils/cn';
import { Palette } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { BOARD_PRESET_COLORS } from './pipelineColorPresets';

function normalizeHex(value: string): string {
  const raw = value.trim();
  if (!raw) return '#6366f1';
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) return withHash.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(withHash)) {
    const c = withHash.slice(1);
    return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`.toLowerCase();
  }
  return withHash.slice(0, 7).toLowerCase();
}

interface PipelineColorPickerProps {
  value?: string | null;
  onChange: (color: string) => void;
  presets?: string[];
  allowClear?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
  /** Larger swatches for card/label pickers */
  swatchSize?: 'sm' | 'md';
}

export default function PipelineColorPicker({
  value,
  onChange,
  presets = BOARD_PRESET_COLORS,
  allowClear,
  onClear,
  clearLabel = 'None',
  className,
  swatchSize = 'sm',
}: PipelineColorPickerProps) {
  const [wheelOpen, setWheelOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(value ?? '#6366f1');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  const normalized = value ? normalizeHex(value) : null;
  const isCustom = normalized != null && !presets.includes(normalized);
  const swatchClass = swatchSize === 'md' ? 'h-9 w-9' : 'h-8 w-8';

  const updatePanelPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const panelWidth = 240;
    const panelHeight = 260;
    let top = rect.bottom + 8;
    let left = rect.left;
    if (top + panelHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - panelHeight - 8);
    }
    left = Math.min(Math.max(12, left), window.innerWidth - panelWidth - 12);
    setPanelPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!wheelOpen) return;
    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [wheelOpen, updatePanelPosition]);

  useEffect(() => {
    if (!wheelOpen) return;
    const onDocPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setWheelOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  }, [wheelOpen]);

  const openWheel = () => {
    setDraftColor(normalized ?? '#6366f1');
    setWheelOpen(true);
  };

  const applyDraft = () => {
    const next = normalizeHex(draftColor);
    onChange(next);
    setWheelOpen(false);
  };

  const handleHexCommit = (raw: string) => {
    setDraftColor(normalizeHex(raw));
  };

  const wheelPanel = wheelOpen && panelPos && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[20500] w-[240px] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl ring-1 ring-black/5"
          style={{ top: panelPos.top, left: panelPos.left }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <HexColorPicker
            color={draftColor}
            onChange={setDraftColor}
            style={{ width: '100%', height: 150 }}
          />
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">#</span>
            <input
              type="text"
              aria-label="Hex color code"
              value={draftColor.replace(/^#/, '')}
              onChange={(e) => setDraftColor(`#${e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)}`)}
              onBlur={(e) => handleHexCommit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyDraft();
              }}
              className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs uppercase tracking-wide focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              maxLength={6}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setWheelOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={applyDraft}>
              Apply
            </Button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {allowClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'flex items-center justify-center rounded-lg border text-xs font-medium transition-colors',
              swatchClass,
              !normalized ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400',
            )}
            title={clearLabel}
          >
            ×
          </button>
        )}
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              'rounded-lg shadow-sm ring-2 ring-offset-1 transition-transform hover:scale-105',
              swatchClass,
              normalized === color ? 'ring-blue-500' : 'ring-transparent',
            )}
            style={{
              backgroundColor: color,
              border: color === '#ffffff' || swatchSize === 'md' ? '1px solid rgba(0,0,0,0.14)' : undefined,
            }}
            aria-label={`Color ${color}`}
          />
        ))}
        <button
          ref={anchorRef}
          type="button"
          onClick={() => (wheelOpen ? setWheelOpen(false) : openWheel())}
          className={cn(
            'flex items-center justify-center rounded-lg border shadow-sm ring-2 ring-offset-1 transition-transform hover:scale-105',
            swatchClass,
            isCustom || wheelOpen ? 'ring-blue-500' : 'ring-transparent border-gray-300',
          )}
          style={isCustom && normalized ? { backgroundColor: normalized } : undefined}
          title="Custom color"
        >
          {!isCustom && <Palette className="h-4 w-4 text-gray-500" />}
        </button>
      </div>
      {wheelPanel}
    </>
  );
}
