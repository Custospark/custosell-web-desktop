import { useState } from 'react';
import { Image, Palette } from 'lucide-react';
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
import { DocumentFormSection, DocumentModalFooter, DocumentModalHero } from './documentFormFields';
import PipelineColorPicker from '../../pipeline/ui/PipelineColorPicker';

interface DocumentsVaultAppearanceModalProps {
  open: boolean;
  appearance: DocumentsVaultAppearance;
  saving?: boolean;
  onClose: () => void;
  onSave: (appearance: DocumentsVaultAppearance) => void;
}

type Mode = 'gradient' | 'color' | 'gallery';

function resolveMode(appearance: DocumentsVaultAppearance): Mode {
  if (appearance.background_type === 'gallery') return 'gallery';
  if (appearance.background_type === 'color') return 'color';
  return 'gradient';
}

function VaultAppearanceForm({
  appearance,
  saving,
  onClose,
  onSave,
}: {
  appearance: DocumentsVaultAppearance;
  saving?: boolean;
  onClose: () => void;
  onSave: (appearance: DocumentsVaultAppearance) => void;
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
    <div className="space-y-5">
      <DocumentModalHero
        icon={Palette}
        title="Vault canvas"
        description="Default background for document workspaces across your business."
        tone="indigo"
      />

      <DocumentFormSection title="Preview" icon={Palette}>
        <div
          className="h-36 overflow-hidden rounded-2xl border border-white/60 shadow-inner"
          style={previewStyle}
        />
      </DocumentFormSection>

      <DocumentFormSection title="Accent color" icon={Palette}>
        <PipelineColorPicker
          value={coverColor}
          presets={FOLDER_PRESET_COLORS}
          swatchSize="md"
          onChange={(color) => setCoverColor(color)}
        />
      </DocumentFormSection>

      <DocumentFormSection title="Canvas style" icon={Image}>
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

        {mode === 'color' && (
          <div className="pt-2">
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
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
      </DocumentFormSection>

      <DocumentModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" loading={saving} onClick={handleSave}>Save canvas</Button>
      </DocumentModalFooter>
    </div>
  );
}

export function DocumentsVaultAppearanceModal({
  open,
  appearance,
  saving = false,
  onClose,
  onSave,
}: DocumentsVaultAppearanceModalProps) {
  const formKey = `${appearance.cover_color ?? ''}-${appearance.background_type ?? ''}-${appearance.background_value ?? ''}`;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Customize vault canvas"
      subtitle="Business-wide default for document workspaces."
      size="lg"
    >
      {open && (
        <VaultAppearanceForm
          key={formKey}
          appearance={appearance}
          saving={saving}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
}
