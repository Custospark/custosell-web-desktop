import { useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { cn } from '../../../shared/utils/cn';
import { Palette } from 'lucide-react';

export const BOARD_PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#ffffff', '#000000',
];

export const CARD_PRESET_COLORS = [
  '#f0f9ff', '#f0fdf4', '#fefce8', '#fef2f2', '#faf5ff', '#fdf2f8', '#f8fafc', '#fff7ed',
];

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
}

export default function PipelineColorPicker({
  value,
  onChange,
  presets = BOARD_PRESET_COLORS,
  allowClear,
  onClear,
  clearLabel = 'None',
  className,
}: PipelineColorPickerProps) {
  const [wheelOpen, setWheelOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value ?? '#6366f1');
  const popoverRef = useRef<HTMLDivElement>(null);
  const normalized = value ? normalizeHex(value) : null;
  const isCustom = normalized != null && !presets.includes(normalized);

  useEffect(() => {
    setHexInput(normalized ?? '#6366f1');
  }, [normalized]);

  useEffect(() => {
    if (!wheelOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setWheelOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [wheelOpen]);

  const handleHexCommit = (raw: string) => {
    const next = normalizeHex(raw);
    setHexInput(next);
    onChange(next);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {allowClear && onClear && (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors',
            !normalized ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300',
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
            'h-8 w-8 rounded-lg shadow-sm ring-2 ring-offset-1 transition-transform hover:scale-105',
            normalized === color ? 'ring-blue-500' : 'ring-transparent',
          )}
          style={{ backgroundColor: color, border: color === '#ffffff' ? '1px solid #d1d5db' : undefined }}
          aria-label={`Color ${color}`}
        />
      ))}
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setWheelOpen((v) => !v)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm ring-2 ring-offset-1 transition-transform hover:scale-105',
            isCustom || wheelOpen ? 'ring-blue-500' : 'ring-transparent border-gray-200',
          )}
          style={isCustom && normalized ? { backgroundColor: normalized } : undefined}
          title="Custom color"
        >
          {!isCustom && <Palette className="h-4 w-4 text-gray-500" />}
        </button>
        {wheelOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-[220px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
            <HexColorPicker
              color={normalized ?? hexInput}
              onChange={(c) => {
                setHexInput(c);
                onChange(c);
              }}
              style={{ width: '100%', height: 140 }}
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">#</span>
              <input
                type="text"
                aria-label="Hex color code"
                value={hexInput.replace(/^#/, '')}
                onChange={(e) => setHexInput(`#${e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)}`)}
                onBlur={() => handleHexCommit(hexInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleHexCommit(hexInput);
                }}
                className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs uppercase tracking-wide focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                maxLength={6}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
