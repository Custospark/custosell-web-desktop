import { useState } from 'react';
import {
  FOLDER_PRESET_COLORS,
  surfaceAppearanceStyle,
  surfaceGradientStyle,
  VAULT_GALLERY_IMAGES,
} from '../../../shared/utils/surfaceStyles';
import type { DocumentsVaultAppearance } from '../api/documentTypes';
import { cn } from '../../../shared/utils/cn';
import { Image, Palette } from 'lucide-react';

type Mode = 'gradient' | 'color' | 'gallery';

function resolveMode(appearance: DocumentsVaultAppearance): Mode {
  if (appearance.background_type === 'gallery') return 'gallery';
  if (appearance.background_type === 'color') return 'color';
  return 'gradient';
}

export function SurfaceAppearancePicker({
  appearance,
  onChange,
}: {
  appearance: DocumentsVaultAppearance;
  onChange: (appearance: DocumentsVaultAppearance) => void;
}) {
  const [coverColor, setCoverColor] = useState(appearance.cover_color ?? '#6366f1');
  const [mode, setMode] = useState<Mode>(resolveMode(appearance));
  const [backgroundValue, setBackgroundValue] = useState(appearance.background_value ?? '#eef2ff');

  const previewStyle = mode === 'gradient'
    ? surfaceGradientStyle(coverColor)
    : surfaceAppearanceStyle({
      cover_color: coverColor,
      background_type: mode === 'gallery' ? 'gallery' : 'color',
      background_value: backgroundValue,
    });

  const emit = (nextCover: string, nextMode: Mode, nextBg: string) => {
    if (nextMode === 'gradient') {
      onChange({ cover_color: nextCover, background_type: null, background_value: null });
      return;
    }
    onChange({
      cover_color: nextCover,
      background_type: nextMode,
      background_value: nextBg,
    });
  };

  return (
    <div className="space-y-4">
      <div
        className="h-32 overflow-hidden rounded-2xl border border-white/60 shadow-inner"
        style={previewStyle}
      />

      <div>
        <p className="mb-2 text-sm font-medium text-gray-900">Accent color</p>
        <div className="flex flex-wrap gap-2">
          {FOLDER_PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => {
                setCoverColor(color);
                emit(color, mode, backgroundValue);
              }}
              className={cn(
                'h-8 w-8 rounded-full ring-2 ring-offset-2 transition',
                coverColor === color ? 'ring-indigo-500' : 'ring-transparent',
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-900">Canvas style</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'gradient', label: 'Gradient', icon: Palette },
            { id: 'color', label: 'Solid', icon: Palette },
            { id: 'gallery', label: 'Photo', icon: Image },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                emit(coverColor, item.id, backgroundValue);
              }}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition',
                mode === item.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'color' && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-700">Solid background</p>
          <div className="flex flex-wrap gap-2">
            {['#eef2ff', '#f0fdf4', '#fff7ed', '#fdf2f8', '#f8fafc', '#ffffff'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  setBackgroundValue(color);
                  emit(coverColor, mode, color);
                }}
                className={cn(
                  'h-8 w-8 rounded-lg border ring-2 ring-offset-1',
                  backgroundValue === color ? 'ring-indigo-500' : 'ring-transparent',
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {mode === 'gallery' && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {VAULT_GALLERY_IMAGES.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => {
                setBackgroundValue(image.url);
                emit(coverColor, mode, image.url);
              }}
              className={cn(
                'aspect-[4/3] overflow-hidden rounded-lg border-2 transition',
                backgroundValue === image.url ? 'border-indigo-500' : 'border-transparent',
              )}
            >
              <img src={image.thumb} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
