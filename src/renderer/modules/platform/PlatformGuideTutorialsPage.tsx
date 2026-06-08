import { useCallback, useMemo, useRef, useState } from 'react';
import { GraduationCap, ImageIcon, Loader2, Pencil, Plus, RefreshCw, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { Button } from '../../shared/components/buttons/Button';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { resolveGuideTutorialThumbnailSrc } from '../guide/api/guideTutorialThumbnail';
import type { GuideTutorialDto, GuideTutorialPayload } from '../guide/api/GuideTypes';
import { GUIDE_TUTORIAL_CATEGORIES } from '../guide/api/GuideTypes';
import {
  useCreatePlatformGuideTutorial,
  useDeletePlatformGuideTutorial,
  usePlatformGuideTutorials,
  usePreviewGuideTutorialThumbnail,
  useUpdatePlatformGuideTutorial,
  useUploadGuideTutorialThumbnail,
} from './api/PlatformGuideQueries';
import { cn } from '../../shared/utils/cn';
import { inputClass, selectClass, textareaClass } from '../../shared/utils/inputStyles';

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

export default function PlatformGuideTutorialsPage() {
  const { confirm } = useConfirm();
  const { data: rows = [], isLoading, isError, refetch, isFetching } = usePlatformGuideTutorials({});
  const createMut = useCreatePlatformGuideTutorial();
  const updateMut = useUpdatePlatformGuideTutorial();
  const deleteMut = useDeletePlatformGuideTutorial();
  const previewMut = usePreviewGuideTutorialThumbnail();
  const uploadMut = useUploadGuideTutorialThumbnail();
  const thumbFileRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GuideTutorialDto | null>(null);
  const [form, setForm] = useState<GuideTutorialPayload>(emptyForm);
  const [thumbHint, setThumbHint] = useState<string | null>(null);

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

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setThumbHint(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: GuideTutorialDto) => {
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description ?? '',
      video_url: row.video_url,
      thumbnail_path: row.thumbnail_path ?? '',
      thumbnail_url: row.thumbnail_url ?? '',
      banner_image_url: row.banner_image_url ?? '',
      category: row.category,
      sort_order: row.sort_order,
      is_published: row.is_published,
    });
    setThumbHint(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setThumbHint(null);
  }, []);

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
        setForm((f) => ({ ...f, thumbnail_url: thumb, thumbnail_path: '' }));
        setThumbHint('Preview applied — save to store it.');
      } else {
        setThumbHint(res.message ?? 'No automatic preview. Upload an image instead.');
      }
    } catch {
      setThumbHint('Could not resolve preview.');
    }
  }, [form.video_url, previewMut]);

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
          setForm((f) => ({ ...f, thumbnail_path: path, thumbnail_url: '' }));
          imperativeToast.show('success', 'Thumbnail uploaded. Save to keep it.');
        }
      } catch {
        imperativeToast.show('error', 'Upload failed.');
      }
    },
    [editing, form.thumbnail_path, uploadMut],
  );

  const onSubmit = useCallback(async () => {
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
      closeModal();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      imperativeToast.show('error', msg ?? 'Save failed.');
    }
  }, [closeModal, createMut, editing, form, updateMut]);

  const onDelete = useCallback(
    async (row: GuideTutorialDto) => {
      const ok = await confirm({
        title: 'Archive tutorial',
        message: `Remove "${row.title}" from the guide?`,
        confirmText: 'Archive',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await deleteMut.mutateAsync(row.id);
        imperativeToast.show('success', 'Tutorial archived.');
      } catch {
        imperativeToast.show('error', 'Could not archive.');
      }
    },
    [confirm, deleteMut],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <GraduationCap className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Guide Settings</p>
            <h1 className="text-xl font-semibold text-gray-900">Tutorials</h1>
            <p className="text-sm text-gray-600">Manage video tutorials shown to all users under Guide.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Add tutorial
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">Could not load tutorials.</p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.title}</td>
                  <td className="px-4 py-3 text-gray-600">{row.category}</td>
                  <td className="px-4 py-3 text-gray-600">{row.sort_order}</td>
                  <td className="px-4 py-3">{row.is_published ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-100" onClick={() => openEdit(row)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="rounded p-1 text-red-500 hover:bg-red-50" onClick={() => void onDelete(row)} aria-label="Archive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No tutorials yet. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit tutorial' : 'New tutorial'}</h2>
              <button type="button" onClick={closeModal} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Title</span>
                <input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Video URL</span>
                <input className={inputClass} value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Description</span>
                <textarea rows={3} className={textareaClass} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Category</span>
                <select className={selectClass} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as GuideTutorialPayload['category'] }))}>
                  {GUIDE_TUTORIAL_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-3">
                <label className="block flex-1 text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Sort order</span>
                  <input type="number" min={0} className={inputClass} value={form.sort_order ?? 0} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input type="checkbox" checked={form.is_published ?? true} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))} />
                  Published
                </label>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">Thumbnail</p>
                {dialogThumbSrc ? (
                  <img src={dialogThumbSrc} alt="" className="mt-2 max-h-32 rounded-lg object-cover" />
                ) : (
                  <div className="mt-2 flex h-24 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void onGenerateThumbnail()} disabled={previewMut.isPending}>
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    From video
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => thumbFileRef.current?.click()} disabled={uploadMut.isPending}>
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                    Upload
                  </Button>
                  <input ref={thumbFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onThumbnailFileChange(e)} />
                </div>
                {thumbHint && <p className="mt-2 text-xs text-gray-500">{thumbHint}</p>}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button onClick={() => void onSubmit()} disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
