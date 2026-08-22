import { useCallback, useState } from 'react';
import { Loader2, Pencil, Plus, RefreshCw, Trash2, Users, Type, Link2, Hash } from 'lucide-react';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { Button } from '../../shared/components/buttons/Button';
import { Modal } from '../../shared/components/modals/Modal';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import {
  DocumentFormSection,
  DocumentIconField,
  DocumentModalFooter,
  DocumentModalHero,
  documentInputClass,
} from '../documents/ui/documentFormFields';
import type {
  GuideCommunityAdminDto,
  GuideCommunityPayload,
} from '../guide/api/GuideTypes';
import { GUIDE_COMMUNITY_PLATFORMS } from '../guide/api/GuideTypes';
import {
  useCreatePlatformGuideCommunity,
  useDeletePlatformGuideCommunity,
  usePlatformGuideCommunities,
  useUpdatePlatformGuideCommunity,
} from './api/PlatformGuideQueries';
import { cn } from '../../shared/utils/cn';

const emptyForm: GuideCommunityPayload = {
  name: '',
  description: '',
  platform: 'whatsapp',
  url: '',
  sort_order: 0,
  is_published: true,
};

const CUSTOM_OPTION = '__custom__';

/** Standard platforms offered in the select. */
const STANDARD_PLATFORMS = ['whatsapp', 'telegram', 'discord', 'facebook', 'x', 'instagram', 'youtube', 'tiktok', 'linkedin', 'slack'] as const;

export default function PlatformGuideCommunitiesPage() {
  const { confirm } = useConfirm();
  const { data: rows = [], isLoading, isError, refetch, isFetching } = usePlatformGuideCommunities({});
  const createMut = useCreatePlatformGuideCommunity();
  const updateMut = useUpdatePlatformGuideCommunity();
  const deleteMut = useDeletePlatformGuideCommunity();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GuideCommunityAdminDto | null>(null);
  const [form, setForm] = useState<GuideCommunityPayload>(emptyForm);
  const [customPlatform, setCustomPlatform] = useState('');
  const [customChosen, setCustomChosen] = useState(false);

  // The select value is the standard platform, or the custom sentinel. An
  // explicit flag (not form.platform) drives this, so picking "Custom…" stays
  // on Custom until the user types - it never snaps back to a standard one.
  const platformSelectValue = customChosen
    ? CUSTOM_OPTION
    : (STANDARD_PLATFORMS as readonly string[]).includes(form.platform)
      ? form.platform
      : CUSTOM_OPTION;
  const isCustomPlatform = customChosen || !(STANDARD_PLATFORMS as readonly string[]).includes(form.platform);

  const setPlatform = (next: string) => {
    if (next === CUSTOM_OPTION) {
      setCustomChosen(true);
      setCustomPlatform('');
      return;
    }
    setCustomChosen(false);
    setCustomPlatform('');
    setForm((f) => ({ ...f, platform: next as GuideCommunityPayload['platform'] }));
  };

  const setCustomPlatformValue = (value: string) => {
    setCustomPlatform(value);
    setForm((f) => ({ ...f, platform: value.trim() as GuideCommunityPayload['platform'] }));
  };

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyForm);
    setCustomPlatform('');
    setCustomChosen(false);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: GuideCommunityAdminDto) => {
    setEditing(row);
    setForm({
      name: row.name,
      description: row.description ?? '',
      platform: row.platform,
      url: row.url,
      sort_order: row.sort_order,
      is_published: row.is_published,
    });
    const isStandard = (STANDARD_PLATFORMS as readonly string[]).includes(row.platform);
    setCustomChosen(!isStandard);
    setCustomPlatform(isStandard ? '' : row.platform);
    setModalOpen(true);
  }, []);

  const onSubmit = useCallback(async () => {
    if (!form.name.trim() || !form.url.trim()) {
      imperativeToast.show('warning', 'Name and URL are required.');
      return;
    }
    if (isCustomPlatform && !customPlatform.trim()) {
      imperativeToast.show('warning', 'Enter a custom platform name.');
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload: form });
        imperativeToast.show('success', 'Community updated.');
      } else {
        await createMut.mutateAsync(form);
        imperativeToast.show('success', 'Community created.');
      }
      setModalOpen(false);
    } catch {
      imperativeToast.show('error', 'Could not save community.');
    }
  }, [createMut, updateMut, editing, form]);

  const onDelete = useCallback(
    async (row: GuideCommunityAdminDto) => {
      const ok = await confirm({
        title: `Archive ${row.name}?`,
        message: 'It will stop being shown to users in the Communities component.',
        confirmText: 'Archive',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await deleteMut.mutateAsync(row.id);
        imperativeToast.show('success', 'Community archived.');
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
            <Users className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Guide Settings</p>
            <h1 className="text-xl font-semibold text-gray-900">Communities</h1>
            <p className="text-sm text-gray-600">
              Company-wide communities (WhatsApp, Telegram, etc.) users can join from the app.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Community
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </div>
      )}

      {isError && <p className="text-sm text-red-600">Could not load communities.</p>}

      {!isLoading && !isError && (
        <div className="space-y-2">
          {rows.map((row) => {
            const platform = GUIDE_COMMUNITY_PLATFORMS.find((p) => p.value === row.platform)?.label ?? row.platform;
            return (
              <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{row.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{row.description || row.url}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {platform} · Order {row.sort_order} · {row.is_published ? 'Published' : 'Draft'}
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
            );
          })}
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">No communities yet.</p>
          )}
        </div>
      )}

      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? 'Edit Community' : 'New Community'}
          subtitle="A company-wide community users can join from the app."
          size="lg"
        >
          <div className="space-y-5">
            <DocumentModalHero
              icon={Users}
              title={editing ? 'Update community' : 'Add a community'}
              description="Provide the platform (WhatsApp, Telegram, etc.) and the invite link users will join."
              tone="indigo"
            />

            <DocumentFormSection title="Community details" icon={Users}>
              <DocumentIconField label="Name" icon={Type} required>
                <input className={documentInputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={120} placeholder="Custosell WhatsApp" />
              </DocumentIconField>
              <DocumentIconField label="Description" icon={Hash} hint="Short note shown to users before they join.">
                <textarea rows={2} className={documentInputClass} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} />
              </DocumentIconField>
              <DocumentIconField label="Platform" icon={Users}>
                <select className={documentInputClass} title="Platform" value={platformSelectValue} onChange={(e) => setPlatform(e.target.value)}>
                  {STANDARD_PLATFORMS.map((value) => {
                    const option = GUIDE_COMMUNITY_PLATFORMS.find((p) => p.value === value);
                    return <option key={value} value={value}>{option?.label ?? value}</option>;
                  })}
                  <option value={CUSTOM_OPTION}>Custom…</option>
                </select>
                {isCustomPlatform && (
                  <input
                    className={`${documentInputClass} mt-2`}
                    value={customPlatform}
                    onChange={(e) => setCustomPlatformValue(e.target.value)}
                    placeholder="e.g. Signal, Threads, Matrix"
                    maxLength={32}
                  />
                )}
              </DocumentIconField>
              <DocumentIconField label="Invite URL" icon={Link2} required hint="Link users open to join (e.g. WhatsApp group invite).">
                <input className={documentInputClass} value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://chat.whatsapp.com/..." />
              </DocumentIconField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DocumentIconField label="Sort order" icon={Hash}>
                  <input type="number" min={0} className={documentInputClass} value={form.sort_order ?? 0} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
                </DocumentIconField>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.is_published ?? true} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))} />
                    Published
                  </label>
                </div>
              </div>
            </DocumentFormSection>

            <DocumentModalFooter>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                type="button"
                loading={createMut.isPending || updateMut.isPending}
                onClick={() => void onSubmit()}
              >
                {editing ? 'Save' : 'Create'}
              </Button>
            </DocumentModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
}