import { useCallback, useState } from 'react';
import { HelpCircle, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { Button } from '../../shared/components/buttons/Button';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import type { GuideFaqAdminDto, GuideFaqPayload } from '../guide/api/GuideTypes';
import {
  useCreatePlatformGuideFaq,
  useDeletePlatformGuideFaq,
  usePlatformGuideFaqs,
  useUpdatePlatformGuideFaq,
} from './api/PlatformGuideQueries';
import { cn } from '../../shared/utils/cn';
import { inputClass, textareaClass } from '../../shared/utils/inputStyles';

const emptyForm: GuideFaqPayload = {
  question: '',
  answer: '',
  sort_order: 0,
  is_published: true,
};

export default function PlatformGuideFaqsPage() {
  const { confirm } = useConfirm();
  const { data: rows = [], isLoading, isError, refetch, isFetching } = usePlatformGuideFaqs({});
  const createMut = useCreatePlatformGuideFaq();
  const updateMut = useUpdatePlatformGuideFaq();
  const deleteMut = useDeletePlatformGuideFaq();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GuideFaqAdminDto | null>(null);
  const [form, setForm] = useState<GuideFaqPayload>(emptyForm);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: GuideFaqAdminDto) => {
    setEditing(row);
    setForm({
      question: row.question,
      answer: row.answer,
      sort_order: row.sort_order,
      is_published: row.is_published,
    });
    setModalOpen(true);
  }, []);

  const onSubmit = useCallback(async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      imperativeToast.show('warning', 'Question and answer are required.');
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload: form });
        imperativeToast.show('success', 'FAQ updated.');
      } else {
        await createMut.mutateAsync(form);
        imperativeToast.show('success', 'FAQ created.');
      }
      setModalOpen(false);
    } catch {
      imperativeToast.show('error', 'Save failed.');
    }
  }, [createMut, editing, form, updateMut]);

  const onDelete = useCallback(
    async (row: GuideFaqAdminDto) => {
      const ok = await confirm({
        title: 'Archive FAQ',
        message: `Remove "${row.question}"?`,
        confirmText: 'Archive',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await deleteMut.mutateAsync(row.id);
        imperativeToast.show('success', 'FAQ archived.');
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
            <HelpCircle className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Guide Settings</p>
            <h1 className="text-xl font-semibold text-gray-900">FAQs</h1>
            <p className="text-sm text-gray-600">Published entries appear on the user Guide → FAQs page.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Add FAQ
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </div>
      )}

      {isError && <p className="text-sm text-red-600">Could not load FAQs.</p>}

      {!isLoading && !isError && (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{row.question}</p>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{row.answer}</p>
                <p className="mt-2 text-xs text-gray-400">
                  Order {row.sort_order} · {row.is_published ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-100" onClick={() => openEdit(row)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" className="rounded p-1 text-red-500 hover:bg-red-50" onClick={() => void onDelete(row)} aria-label="Archive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-8">No FAQs yet.</p>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit FAQ' : 'New FAQ'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Question</span>
                <input className={inputClass} value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} maxLength={500} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Answer</span>
                <textarea rows={8} className={textareaClass} value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} />
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
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => void onSubmit()} disabled={createMut.isPending || updateMut.isPending}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
