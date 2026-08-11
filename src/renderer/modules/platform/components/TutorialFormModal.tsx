import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlignLeft, Check, Eye, FolderOpen, Hash, ImageIcon, Link2, PlayCircle, Sparkles, Upload } from 'lucide-react';
import { imperativeToast } from '../../../app/contexts/imperativeToast';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from '../../pipeline/ui/pipelineFormFields';
import { resolveGuideTutorialThumbnailSrc } from '../../guide/api/guideTutorialThumbnail';
import type { GuideTutorialDto, GuideTutorialPayload } from '../../guide/api/GuideTypes';
import { GUIDE_TUTORIAL_CATEGORIES } from '../../guide/api/GuideTypes';
import {
  useCreatePlatformGuideTutorial,
  usePreviewGuideTutorialThumbnail,
  useUpdatePlatformGuideTutorial,
  useUploadGuideTutorialThumbnail,
} from '../api/PlatformGuideQueries';

interface TutorialFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: GuideTutorialDto | null;
}

const emptyForm: GuideTutorialPayload = {
  title: '',
  description: '',
  video_url: '',
  thumbnail_path: '',
  thumbnail_url: '',
  banner_image_url: '',
  category: 'general',
  sort_order: 0,
  is_published: true,
};

export default function TutorialFormModal({ open, onClose, editing }: TutorialFormModalProps) {
  const createMut = useCreatePlatformGuideTutorial();
  const updateMut = useUpdatePlatformGuideTutorial();
  const previewMut = usePreviewGuideTutorialThumbnail();
  const uploadMut = useUploadGuideTutorialThumbnail();
  const thumbFileRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editing;
  const isSubmitting = createMut.isPending || updateMut.isPending;

  const [form, setForm] = useState<GuideTutorialPayload>(emptyForm);
  const [thumbHint, setThumbHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      if (editing) {
        setForm({
          title: editing.title,
          description: editing.description ?? '',
          video_url: editing.video_url,
          thumbnail_path: editing.thumbnail_path ?? '',
          thumbnail_url: editing.thumbnail_url ?? '',
          banner_image_url: editing.banner_image_url ?? '',
          category: editing.category,
          sort_order: editing.sort_order,
          is_published: editing.is_published,
        });
      } else {
        setForm(emptyForm);
      }
      setThumbHint(null);
    });
  }, [open, editing]);

  const update = useCallback(
    <K extends keyof GuideTutorialPayload>(key: K, val: GuideTutorialPayload[K]) =>
      setForm((p) => ({ ...p, [key]: val })),
    [],
  );

  const dialogThumbSrc = useMemo(
    () =>
      resolveGuideTutorialThumbnailSrc({
        thumbnail_path: form.thumbnail_path?.trim() || null,
        thumbnail_url: form.thumbnail_url?.trim() || null,
        thumbnail_upload_url: form.thumbnail_path?.trim()
          ? null
          : editing?.thumbnail_upload_url ?? null,
        thumbnail_video_preview_url: editing?.thumbnail_video_preview_url ?? null,
      }),
    [editing, form.thumbnail_path, form.thumbnail_url],
  );

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const onGenerateThumbnail = useCallback(async () => {
    const url = form.video_url?.trim();
    if (!url) {
      setThumbHint('Add a video URL first.');
      return;
    }
    try {
      const res = await previewMut.mutateAsync({ video_url: url });
      const thumb = res.data?.thumbnail_url;
      if (thumb) {
        update('thumbnail_url', thumb);
        update('thumbnail_path', '');
        setThumbHint('Preview applied — save to store it.');
      } else {
        setThumbHint(res.message ?? 'No automatic preview. Upload an image instead.');
      }
    } catch {
      setThumbHint('Could not resolve preview.');
    }
  }, [form.video_url, previewMut, update]);

  const onThumbnailFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const res = await uploadMut.mutateAsync({
          file,
          tutorialId: editing?.id,
          previousThumbnailPath: !editing && form.thumbnail_path?.trim() ? form.thumbnail_path.trim() : undefined,
        });
        const path = res.data?.thumbnail_path;
        if (path) {
          update('thumbnail_path', path);
          update('thumbnail_url', '');
          imperativeToast.show('success', 'Thumbnail uploaded. Save to keep it.');
        }
      } catch {
        imperativeToast.show('error', 'Upload failed.');
      }
    },
    [editing, form.thumbnail_path, uploadMut, update],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const payload: GuideTutorialPayload = {
        ...form,
        description: form.description?.trim() || null,
        thumbnail_path: form.thumbnail_path?.trim() || null,
        thumbnail_url: form.thumbnail_url?.trim() || null,
        banner_image_url: form.banner_image_url?.trim() || null,
      };
      if (!payload.title.trim() || !payload.video_url.trim()) {
        imperativeToast.show('warning', 'Title and video URL are required.');
        return;
      }
      try {
        if (editing) {
          await updateMut.mutateAsync({ id: editing.id, payload });
          imperativeToast.show('success', 'Tutorial updated.');
        } else {
          await createMut.mutateAsync(payload);
          imperativeToast.show('success', 'Tutorial created.');
        }
        onClose();
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        imperativeToast.show('error', msg ?? 'Save failed.');
      }
    },
    [createMut, editing, form, onClose, updateMut],
  );

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={isEditing ? 'Edit tutorial' : 'New tutorial'}
      subtitle={isEditing ? 'Update tutorial details' : 'Add a video tutorial shown under Guide.'}
      size="lg"
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <PipelineModalHero
          icon={PlayCircle}
          tone="blue"
          title={isEditing ? 'Update tutorial' : 'New tutorial'}
          description="Video guides that appear under Guide for all users."
        />

        <PipelineFormSection title="Details" icon={PlayCircle} description="Title, video link, and description.">
          <PipelineIconField label="Title" icon={Link2} required>
            <input
              className={pipelineInputClass}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Getting started with sales"
              required
              autoFocus
            />
          </PipelineIconField>
          <PipelineIconField label="Video URL" icon={PlayCircle} required>
            <input
              className={pipelineInputClass}
              value={form.video_url}
              onChange={(e) => update('video_url', e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              required
            />
          </PipelineIconField>
          <PipelineIconField label="Description" icon={AlignLeft}>
            <textarea
              rows={3}
              className={`${pipelineInputClass} min-h-[80px]`}
              value={form.description ?? ''}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Optional description"
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Publishing" icon={Eye} description="Category, ordering, and visibility.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PipelineIconField label="Category" icon={FolderOpen}>
              <select
                className={pipelineSelectClass}
                value={form.category}
                onChange={(e) => update('category', e.target.value as GuideTutorialPayload['category'])}
              >
                {GUIDE_TUTORIAL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </PipelineIconField>
            <PipelineIconField label="Sort order" icon={Hash}>
              <input
                type="number"
                min={0}
                className={pipelineInputClass}
                value={form.sort_order ?? 0}
                onChange={(e) => update('sort_order', Number(e.target.value))}
              />
            </PipelineIconField>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_published ?? true}
              onChange={(e) => update('is_published', e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            Published — visible under Guide
          </label>
        </PipelineFormSection>

        <PipelineFormSection title="Thumbnail" icon={ImageIcon} description="Auto-preview from the video or upload an image.">
          <div className="space-y-3">
            {dialogThumbSrc ? (
              <img src={dialogThumbSrc} alt="" className="max-h-32 rounded-lg object-cover" />
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => void onGenerateThumbnail()} disabled={previewMut.isPending}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                From video
              </Button>
              <Button variant="secondary" size="sm" type="button" onClick={() => thumbFileRef.current?.click()} disabled={uploadMut.isPending}>
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Upload
              </Button>
              <input ref={thumbFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onThumbnailFileChange(e)} />
            </div>
            {thumbHint && <p className="text-xs text-gray-500">{thumbHint}</p>}
          </div>
        </PipelineFormSection>

        <div className="sticky bottom-0 -mx-6 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-6 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 sm:w-auto">
            <Check className="h-4 w-4" />
            {isEditing ? 'Save tutorial' : 'Add tutorial'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
