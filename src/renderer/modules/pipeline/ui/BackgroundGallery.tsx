import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { resolveBoardBackgroundImageUrl } from '../api/pipelineKanbanCache';
import PipelineColorPicker from './PipelineColorPicker';
import { Upload, Image, Palette, History } from 'lucide-react';

const GALLERY_IMAGES = [
  { id: 1, url: 'https://picsum.photos/id/10/1200/800', thumb: 'https://picsum.photos/id/10/400/300' },
  { id: 15, url: 'https://picsum.photos/id/15/1200/800', thumb: 'https://picsum.photos/id/15/400/300' },
  { id: 26, url: 'https://picsum.photos/id/26/1200/800', thumb: 'https://picsum.photos/id/26/400/300' },
  { id: 28, url: 'https://picsum.photos/id/28/1200/800', thumb: 'https://picsum.photos/id/28/400/300' },
  { id: 36, url: 'https://picsum.photos/id/36/1200/800', thumb: 'https://picsum.photos/id/36/400/300' },
  { id: 40, url: 'https://picsum.photos/id/40/1200/800', thumb: 'https://picsum.photos/id/40/400/300' },
  { id: 44, url: 'https://picsum.photos/id/44/1200/800', thumb: 'https://picsum.photos/id/44/400/300' },
  { id: 48, url: 'https://picsum.photos/id/48/1200/800', thumb: 'https://picsum.photos/id/48/400/300' },
  { id: 50, url: 'https://picsum.photos/id/50/1200/800', thumb: 'https://picsum.photos/id/50/400/300' },
  { id: 57, url: 'https://picsum.photos/id/57/1200/800', thumb: 'https://picsum.photos/id/57/400/300' },
  { id: 63, url: 'https://picsum.photos/id/63/1200/800', thumb: 'https://picsum.photos/id/63/400/300' },
  { id: 68, url: 'https://picsum.photos/id/68/1200/800', thumb: 'https://picsum.photos/id/68/400/300' },
];

type BackgroundMode = 'color' | 'gallery' | 'upload';

interface BackgroundGalleryProps {
  boardId: number;
  currentType?: string;
  currentValue?: string | null;
  uploadHistory?: string[];
  onSelect: (type: BackgroundMode, value: string) => void;
  onUpload?: (file: File) => void;
  isUploading?: boolean;
}

export default function BackgroundGallery({
  boardId,
  currentType,
  currentValue,
  uploadHistory = [],
  onSelect,
  onUpload,
  isUploading,
}: BackgroundGalleryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localBlobPreview, setLocalBlobPreview] = useState<string | null>(null);
  const blobPreviewRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (blobPreviewRef.current) URL.revokeObjectURL(blobPreviewRef.current);
  }, []);

  const savedUploadPreview = useMemo(() => {
    if (currentType === 'upload' && currentValue) {
      return resolveBoardBackgroundImageUrl('upload', currentValue);
    }
    return null;
  }, [currentType, currentValue]);

  const uploadPreview = localBlobPreview ?? savedUploadPreview;

  const historyThumbs = useMemo(
    () => uploadHistory.map((path) => ({
      path,
      url: resolveBoardBackgroundImageUrl('upload', path),
    })).filter((item): item is { path: string; url: string } => Boolean(item.url)),
    [uploadHistory],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    if (blobPreviewRef.current) {
      URL.revokeObjectURL(blobPreviewRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    blobPreviewRef.current = previewUrl;
    setLocalBlobPreview(previewUrl);
    onUpload(file);
    e.target.value = '';
  };

  const uploadSelected = currentType === 'upload' && Boolean(currentValue);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <Palette className="h-3 w-3" />
          Solid colors
        </p>
        <PipelineColorPicker
          value={currentType === 'color' ? currentValue ?? undefined : undefined}
          onChange={(color) => onSelect('color', color)}
        />
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <Image className="h-3 w-3" />
          Gallery images
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {GALLERY_IMAGES.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onSelect('gallery', img.url)}
              className={cn(
                'relative aspect-video overflow-hidden rounded-lg shadow-sm ring-2 ring-offset-1 transition-transform hover:scale-105',
                currentType === 'gallery' && currentValue === img.url ? 'ring-blue-500' : 'ring-transparent',
              )}
            >
              <img src={img.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <Upload className="h-3 w-3" />
          Upload custom
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-sm transition-colors',
            uploadSelected || uploadPreview
              ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-200 ring-offset-1'
              : 'border-gray-300 hover:border-gray-400',
          )}
        >
          {isUploading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          ) : uploadPreview ? (
            <>
              <img
                src={uploadPreview}
                alt="Custom board background preview"
                className="max-h-24 w-full max-w-xs rounded-lg object-cover shadow-sm"
              />
              <span className="text-xs font-medium text-blue-700">Custom image selected · click to replace</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-gray-400" />
              <span className="text-gray-500">Click to upload a custom background image</span>
            </>
          )}
        </button>
      </div>

      {historyThumbs.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <History className="h-3 w-3" />
            Your uploads
            <span className="font-normal text-gray-400">— reuse a previous image</span>
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {historyThumbs.map(({ path, url }) => (
              <button
                key={`${boardId}-${path}`}
                type="button"
                onClick={() => onSelect('upload', path)}
                className={cn(
                  'relative aspect-video overflow-hidden rounded-lg shadow-sm ring-2 ring-offset-1 transition-transform hover:scale-105',
                  currentType === 'upload' && currentValue === path ? 'ring-blue-500' : 'ring-transparent',
                )}
                title="Reuse this upload"
              >
                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
