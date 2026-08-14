import { useMemo, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import {
  useBoardResourceMembers,
  useBoardResources,
  useCreateBoardLinkResource,
  useDeleteBoardResource,
  useRecordBoardResourceDownload,
  useRecordBoardResourceView,
  useUpdateBoardResource,
  useUploadBoardResource,
} from '../api/usePipelineResourceQueries';
import type { PipelineBoardResource } from '../api/pipelineTypes';
import { pipelineInputClass } from './pipelineFormFields';
import { ChevronDown, FolderOpen, Plus, Search } from 'lucide-react';
import { ResourceFormFields, ResourceRow } from './boardResourceItemComponents';
import {
  buildResourceGroups,
  resourceMatchesSearch,
  TYPE_LABEL,
  type AddMode,
  type GroupFilter,
} from './boardResourceHelpers';

interface BoardResourcesModalProps {
  boardId: number;
  canContribute: boolean;
  open: boolean;
  onClose: () => void;
}

export default function BoardResourcesModal({
  boardId,
  canContribute,
  open,
  onClose,
}: BoardResourcesModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: resources = [], isLoading, isFetching } = useBoardResources(boardId, open);
  const { data: boardMembers = [] } = useBoardResourceMembers(boardId, open);
  const createLink = useCreateBoardLinkResource(boardId);
  const uploadFile = useUploadBoardResource(boardId);
  const updateResource = useUpdateBoardResource(boardId);
  const deleteResource = useDeleteBoardResource(boardId);
  const recordView = useRecordBoardResourceView(boardId);
  const recordDownload = useRecordBoardResourceDownload(boardId);

  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('file');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [groupName, setGroupName] = useState('');
  const [visibility, setVisibility] = useState<PipelineBoardResource['visibility']>('board');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  const groupSuggestions = useMemo(
    () =>
      [...new Set(resources.map((resource) => resource.group_name?.trim()).filter(Boolean) as string[])].sort(
        (a, b) => a.localeCompare(b),
      ),
    [resources],
  );

  const filterChips = useMemo(() => {
    const chips: { key: GroupFilter; label: string; count: number }[] = [
      { key: 'all', label: 'All', count: resources.length },
    ];
    (['link', 'image', 'file'] as PipelineBoardResource['type'][]).forEach((type) => {
      const count = resources.filter((resource) => resource.type === type).length;
      if (count > 0) chips.push({ key: type, label: TYPE_LABEL[type], count });
    });
    groupSuggestions.forEach((group) => {
      const count = resources.filter((resource) => resource.group_name?.trim() === group).length;
      if (count > 0) chips.push({ key: group, label: group, count });
    });
    return chips;
  }, [resources, groupSuggestions]);

  const searchedResources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resources.filter((resource) => resourceMatchesSearch(resource, q));
  }, [resources, searchQuery]);

  const resourceGroups = useMemo(
    () => buildResourceGroups(searchedResources, groupFilter),
    [searchedResources, groupFilter],
  );

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setGroupName('');
    setVisibility('board');
    setSelectedMemberIds([]);
    setPendingFile(null);
    setMemberSearch('');
    setAddMode('file');
    setShowAdd(false);
  };

  const handleSubmit = async () => {
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      group_name: groupName.trim() || null,
      visibility,
      member_user_ids: visibility === 'members' ? selectedMemberIds : [],
    };

    if (addMode === 'link') {
      if (!payload.title || !url.trim()) return;
      await createLink.mutateAsync({ ...payload, url: url.trim() });
    } else {
      if (!pendingFile) return;
      await uploadFile.mutateAsync({
        ...payload,
        title: payload.title || pendingFile.name,
        file: pendingFile,
      });
    }
    resetForm();
  };

  const openResource = async (resource: PipelineBoardResource) => {
    const updated = await recordView.mutateAsync(resource.id);
    const target = updated.file_url || updated.url;
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  };

  const downloadResource = async (resource: PipelineBoardResource) => {
    if (!resource.file_url) return;
    const updated = await recordDownload.mutateAsync(resource.id);
    const link = document.createElement('a');
    link.href = updated.file_url ?? resource.file_url;
    link.download = updated.file_name ?? resource.file_name ?? 'download';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showLoading = isLoading || (isFetching && resources.length === 0);
  const saving = createLink.isPending || uploadFile.isPending;

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        resetForm();
        setSearchQuery('');
        setGroupFilter('all');
        onClose();
      }}
      title="Board resources"
      subtitle="Files, links, and images shared with your board team"
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <span className="relative inline-flex">
              <FolderOpen className="h-4 w-4 text-emerald-600" />
              {resources.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                  {resources.length > 99 ? '99+' : resources.length}
                </span>
              )}
            </span>
            <span>
              <span className="font-semibold text-gray-900">{resources.length}</span> resource
              {resources.length === 1 ? '' : 's'}
            </span>
          </div>
          {canContribute && (
            <Button type="button" size="sm" onClick={() => setShowAdd((v) => !v)}>
              <Plus className="h-4 w-4" />
              {showAdd ? 'Cancel' : 'Add resource'}
            </Button>
          )}
        </div>

        {resources.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description, group, owner, or file name…"
                className={cn(pipelineInputClass, 'pl-9')}
              />
            </div>
            {filterChips.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {filterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setGroupFilter(chip.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                      groupFilter === chip.key
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    )}
                  >
                    {chip.label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px]',
                        groupFilter === chip.key ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600',
                      )}
                    >
                      {chip.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showAdd && canContribute && (
          <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="mb-3 flex gap-2">
              {(['file', 'link'] as AddMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAddMode(mode)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    addMode === mode
                      ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                      : 'text-gray-600 hover:bg-white/70',
                  )}
                >
                  {mode === 'file' ? 'Upload file' : 'Add link'}
                </button>
              ))}
            </div>
            <ResourceFormFields
              addMode={addMode}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              url={url}
              setUrl={setUrl}
              groupName={groupName}
              setGroupName={setGroupName}
              groupSuggestions={groupSuggestions}
              visibility={visibility}
              setVisibility={setVisibility}
              selectedMemberIds={selectedMemberIds}
              setSelectedMemberIds={setSelectedMemberIds}
              boardMembers={boardMembers}
              memberSearch={memberSearch}
              setMemberSearch={setMemberSearch}
              pendingFile={pendingFile}
              onPickFile={() => fileRef.current?.click()}
            />
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xlsx,.txt,.csv"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              className="mt-3"
              onClick={() => void handleSubmit()}
              disabled={
                saving
                || (addMode === 'link' && (!title.trim() || !url.trim()))
                || (addMode === 'file' && !pendingFile)
                || (visibility === 'members' && selectedMemberIds.length === 0)
              }
              loading={saving}
            >
              {addMode === 'file' ? 'Upload resource' : 'Save link'}
            </Button>
          </section>
        )}

        {showLoading ? (
          <div className="flex justify-center py-12">
            <CustosellLoader />
          </div>
        ) : resources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
            <FolderOpen className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">No resources yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Upload files, images, or links your board team can reference anytime.
            </p>
          </div>
        ) : searchedResources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <Search className="mx-auto h-7 w-7 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">No matching resources</p>
            <p className="mt-1 text-xs text-gray-500">Try a different search term or filter.</p>
          </div>
        ) : (
          <div className="max-h-[min(60vh,520px)] space-y-4 overflow-y-auto pr-1">
            {resourceGroups.map((group) => {
              const collapsed = collapsedGroups.has(group.key);
              return (
                <section key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="mb-2 flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100"
                  >
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
                      {group.label}
                      <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">
                        {group.items.length}
                      </span>
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', collapsed && '-rotate-90')} />
                  </button>
                  {!collapsed && (
                    <div className="space-y-3">
                      {group.items.map((resource) => (
                        <ResourceRow
                          key={resource.id}
                          resource={resource}
                          onOpen={() => void openResource(resource)}
                          onDownload={() => void downloadResource(resource)}
                          onDelete={() => void deleteResource.mutateAsync(resource.id)}
                          deleting={deleteResource.isPending}
                          boardMembers={boardMembers}
                          groupSuggestions={groupSuggestions}
                          updateResource={updateResource}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
