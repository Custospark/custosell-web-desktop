import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import {
  FOLDER_PRESET_COLORS,
  surfaceAppearanceStyle,
  surfaceGradientStyle,
  VAULT_GALLERY_IMAGES,
} from '../../../shared/utils/surfaceStyles';
import type { DocumentsVaultAppearance } from '../api/documentTypes';
import { cn } from '../../../shared/utils/cn';
import { Image, Palette } from 'lucide-react';

interface DocumentsVaultAppearanceModalProps {
  open: boolean;
  appearance: DocumentsVaultAppearance;
  saving?: boolean;
  onClose: () => void;
  onSave: (appearance: DocumentsVaultAppearance) => void;
}

type Mode = 'gradient' | 'color' | 'gallery';

export function DocumentsVaultAppearanceModal({
  open,
  appearance,
  saving = false,
  onClose,
  onSave,
}: DocumentsVaultAppearanceModalProps) {
  const [coverColor, setCoverColor] = useState(appearance.cover_color ?? '#6366f1');
  const [mode, setMode] = useState<Mode>(
    appearance.background_type === 'gallery' ? 'gallery'
      : appearance.background_type === 'color' ? 'color'
        : 'gradient',
  );
  const [backgroundValue, setBackgroundValue] = useState(appearance.background_value ?? '#eef2ff');

  useEffect(() => {
    if (!open) return;
    setCoverColor(appearance.cover_color ?? '#6366f1');
    setMode(
      appearance.background_type === 'gallery' ? 'gallery'
        : appearance.background_type === 'color' ? 'color'
          : 'gradient',
    );
    setBackgroundValue(appearance.background_value ?? '#eef2ff');
  }, [appearance, open]);

  const previewStyle = mode === 'gradient'
    ? surfaceGradientStyle(coverColor)
    : surfaceAppearanceStyle({
      cover_color: coverColor,
      background_type: mode === 'gallery' ? 'gallery' : 'color',
      background_value: backgroundValue,
    });

  const handleSave = () => {
    if (mode === 'gradient') {
      onSave({
        cover_color: coverColor,
        background_type: null,
        background_value: null,
      });
      return;
    }

    onSave({
      cover_color: coverColor,
      background_type: mode,
      background_value: backgroundValue,
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Customize vault canvas">
      <div className="space-y-5">
        <div
          className="h-36 overflow-hidden rounded-2xl border border-white/60 shadow-inner"
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
                onClick={() => setCoverColor(color)}
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
                onClick={() => setMode(item.id)}
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
                  onClick={() => setBackgroundValue(color)}
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
          <div className="grid grid-cols-4 gap-2">
            {VAULT_GALLERY_IMAGES.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setBackgroundValue(image.url)}
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" loading={saving} onClick={handleSave}>Save canvas</Button>
        </div>
      </div>
    </Modal>
  );
}
