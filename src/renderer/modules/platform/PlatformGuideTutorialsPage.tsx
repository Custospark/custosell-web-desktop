import { useCallback, useState } from 'react';
import { GraduationCap, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { Button } from '../../shared/components/buttons/Button';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import type { GuideTutorialDto } from '../guide/api/GuideTypes';
import {
  useDeletePlatformGuideTutorial,
  usePlatformGuideTutorials,
} from './api/PlatformGuideQueries';
import { cn } from '../../shared/utils/cn';
import TutorialFormModal from './components/TutorialFormModal';

export default function PlatformGuideTutorialsPage() {
  const { confirm } = useConfirm();
  const { data: rows = [], isLoading, isError, refetch, isFetching } = usePlatformGuideTutorials({});
  const deleteMut = useDeletePlatformGuideTutorial();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GuideTutorialDto | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: GuideTutorialDto) => {
    setEditing(row);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
  }, []);

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

      <TutorialFormModal
        open={modalOpen}
        onClose={closeModal}
        editing={editing}
      />
    </div>
  );
}
