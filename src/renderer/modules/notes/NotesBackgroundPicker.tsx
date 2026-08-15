import { cn } from '../../shared/utils/cn';
import PipelineColorPicker from '../pipeline/ui/PipelineColorPicker';
import {
  NOTES_BACKGROUND_COLORS,
  NOTES_BACKGROUND_IMAGES,
  type NotesBackground,
} from './notesBackground';
import { Image, Palette } from 'lucide-react';

interface NotesBackgroundPickerProps {
  current: NotesBackground;
  onChange: (bg: NotesBackground) => void;
}

/** Notes-page background chooser - 8 solid colors + 20 gallery images, matching the board background standard. */
export default function NotesBackgroundPicker({ current, onChange }: NotesBackgroundPickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <Palette className="h-3 w-3" />
          Solid colors
        </p>
        <PipelineColorPicker
          value={current.type === 'color' ? current.value ?? undefined : undefined}
          onChange={(color) => onChange({ type: 'color', value: color })}
          presets={NOTES_BACKGROUND_COLORS}
        />
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <Image className="h-3 w-3" />
          Gallery images
          <span className="font-normal text-gray-400">- {NOTES_BACKGROUND_IMAGES.length} options</span>
        </p>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-100 p-1.5">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {NOTES_BACKGROUND_IMAGES.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onChange({ type: 'gallery', value: img.url })}
                className={cn(
                  'relative aspect-video overflow-hidden rounded-lg shadow-sm ring-2 ring-offset-1 transition-transform hover:scale-105',
                  current.type === 'gallery' && current.value === img.url ? 'ring-blue-500' : 'ring-transparent',
                )}
                aria-label="Use this background"
              >
                <img src={img.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
