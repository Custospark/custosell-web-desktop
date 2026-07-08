import { useMemo, useRef, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
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
import type {
  PipelineBoardResource,
  PipelineBoardResourceType,
  PipelineBoardResourceVisibility,
  PipelineUserRef,
} from '../api/pipelineTypes';
import { PipelineUserAttribution } from './pipelineUserAttribution';
import { pipelineInputClass } from './pipelineFormFields';
import {
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface BoardResourcesModalProps {
  boardId: number;
  canContribute: boolean;
  open: boolean;
  onClose: () => void;
}

type AddMode = 'file' | 'link';
type GroupFilter = 'all' | PipelineBoardResourceType | string;

interface ResourceGroup {
  key: string;
  label: string;
  items: PipelineBoardResource[];
}

const VISIBILITY_OPTIONS: { value: PipelineBoardResourceVisibility; label: string; hint: string }[] = [
  { value: 'board', label: 'Everyone on board', hint: 'Anyone who can view this board' },
  { value: 'team', label: 'Board team', hint: 'Board creator and invited team members' },
  { value: 'members', label: 'Selected members', hint: 'Pick specific board members below' },
  { value: 'owner_only', label: 'Only me', hint: 'Private unless you are the business owner' },
];

const VISIBILITY_LABEL: Record<PipelineBoardResourceVisibility, string> = {
  board: 'Board',
  team: 'Team',
  members: 'Selected',
  owner_only: 'Private',
};

const TYPE_LABEL: Record<PipelineBoardResourceType, string> = {
  link: 'Links',
  image: 'Images',
  file: 'Files',
};

function formatBytes(size?: number | null): string {
  if (!size || size <= 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function resourceIcon(type: PipelineBoardResource['type']) {
  if (type === 'link') return Link2;
  if (type === 'image') return ImageIcon;
  return FileText;
}

function resourceMatchesSearch(resource: PipelineBoardResource, query: string): boolean {
  if (!query) return true;
  const haystack = [
    resource.title,
    resource.description,
    resource.file_name,
    resource.group_name,
    resource.owner?.name,
    resource.url,
    VISIBILITY_LABEL[resource.visibility],
    TYPE_LABEL[resource.type],
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function buildResourceGroups(resources: PipelineBoardResource[], filter: GroupFilter): ResourceGroup[] {
  const filtered =
    filter === 'all'
      ? resources
      : resources.filter((resource) =>
          ['link', 'image', 'file'].includes(filter)
            ? resource.type === filter
            : resource.group_name?.trim() === filter,
        );

  const named = new Map<string, PipelineBoardResource[]>();
  const ungrouped: PipelineBoardResource[] = [];

  for (const resource of filtered) {
    const groupName = resource.group_name?.trim();
    if (groupName) {
      named.set(groupName, [...(named.get(groupName) ?? []), resource]);
    } else {
      ungrouped.push(resource);
    }
  }

  const groups: ResourceGroup[] = [];
  [...named.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([label, items]) => {
      groups.push({ key: `group:${label}`, label, items });
    });

  (['link', 'image', 'file'] as PipelineBoardResourceType[]).forEach((type) => {
    const items = ungrouped.filter((resource) => resource.type === type);
    if (items.length > 0) {
      groups.push({ key: `type:${type}`, label: TYPE_LABEL[type], items });
    }
  });

  return groups;
}

function MemberPicker({
  members,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
  search,
  onSearchChange,
}: {
  members: PipelineUserRef[];
  selectedIds: number[];
  onToggle: (userId: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => member.name.toLowerCase().includes(q));
  }, [members, search]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-700">
          Board members ({selectedIds.length}/{members.length} selected)
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onSelectAll} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
            Select all
          </button>
          <button type="button" onClick={onClear} className="text-[11px] font-semibold text-gray-500 hover:text-gray-700">
            Clear
          </button>
        </div>
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search board members…"
        className={cn(pipelineInputClass, 'mb-2')}
      />
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-gray-500">No board members match your search.</p>
        ) : (
          filtered.map((member) => {
            const selected = selectedIds.includes(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onToggle(member.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  selected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50',
                )}
              >
                <UserAvatar name={member.name} avatar={member.avatar} size="xs" />
                <span className="flex-1 truncate">{member.name}</span>
                {selected && <span className="text-[10px] font-semibold text-indigo-600">Selected</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ResourceFormFields({
  addMode,
  title,
  setTitle,
  description,
  setDescription,
  url,
  setUrl,
  groupName,
  setGroupName,
  groupSuggestions,
  visibility,
  setVisibility,
  selectedMemberIds,
  setSelectedMemberIds,
  boardMembers,
  memberSearch,
  setMemberSearch,
  pendingFile,
  onPickFile,
  fileInputRef,
}: {
  addMode: AddMode;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  url: string;
  setUrl: (value: string) => void;
  groupName: string;
  setGroupName: (value: string) => void;
  groupSuggestions: string[];
  visibility: PipelineBoardResourceVisibility;
  setVisibility: (value: PipelineBoardResourceVisibility) => void;
  selectedMemberIds: number[];
  setSelectedMemberIds: (value: number[]) => void;
  boardMembers: PipelineUserRef[];
  memberSearch: string;
  setMemberSearch: (value: string) => void;
  pendingFile: File | null;
  onPickFile: () => void;
}) {
  const toggleMember = (userId: number) => {
    setSelectedMemberIds(
      selectedMemberIds.includes(userId)
        ? selectedMemberIds.filter((id) => id !== userId)
        : [...selectedMemberIds, userId],
    );
  };

  return (
    <div className="space-y-3">
      {addMode === 'file' ? (
        <button
          type="button"
          onClick={onPickFile}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-white px-4 py-6 text-sm text-indigo-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50"
        >
          <Upload className="h-4 w-4" />
          {pendingFile ? pendingFile.name : 'Choose a file or image (max 10 MB)'}
        </button>
      ) : (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/document"
          className={pipelineInputClass}
        />
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={addMode === 'link' ? 'Link title' : 'Title (optional — uses file name)'}
        className={pipelineInputClass}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className={cn(pipelineInputClass, 'resize-none')}
      />
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Group (optional)</label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="e.g. Brand assets, Contracts"
          list="board-resource-groups"
          className={pipelineInputClass}
        />
        <datalist id="board-resource-groups">
          {groupSuggestions.map((group) => (
            <option key={group} value={group} />
          ))}
        </datalist>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Visibility</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {VISIBILITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'cursor-pointer rounded-lg border p-3 transition-colors',
                visibility === option.value
                  ? 'border-indigo-300 bg-white ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <input
                type="radio"
                name="resource-visibility"
                value={option.value}
                checked={visibility === option.value}
                onChange={() => setVisibility(option.value)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
              <span className="mt-0.5 block text-[11px] text-gray-500">{option.hint}</span>
            </label>
          ))}
        </div>
      </div>

      {visibility === 'members' && (
        <MemberPicker
          members={boardMembers}
          selectedIds={selectedMemberIds}
          onToggle={toggleMember}
          onSelectAll={() => setSelectedMemberIds(boardMembers.map((member) => member.id))}
          onClear={() => setSelectedMemberIds([])}
          search={memberSearch}
          onSearchChange={setMemberSearch}
        />
      )}
    </div>
  );
}

function ResourceRow({
  resource,
  onOpen,
  onDownload,
  onDelete,
  deleting,
  boardMembers,
  groupSuggestions,
  updateResource,
}: {
  resource: PipelineBoardResource;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
  deleting: boolean;
  boardMembers: PipelineUserRef[];
  groupSuggestions: string[];
  updateResource: ReturnType<typeof useUpdateBoardResource>;
}) {
  const Icon = resourceIcon(resource.type);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description ?? '');
  const [url, setUrl] = useState(resource.url ?? '');
  const [groupName, setGroupName] = useState(resource.group_name ?? '');
  const [visibility, setVisibility] = useState(resource.visibility);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>(
    resource.members?.map((member) => member.id) ?? [],
  );
  const [memberSearch, setMemberSearch] = useState('');

  const saveEdit = async () => {
    await updateResource.mutateAsync({
      id: resource.id,
      title: title.trim(),
      description: description.trim() || null,
      group_name: groupName.trim() || null,
      visibility,
      url: resource.type === 'link' ? url.trim() : undefined,
      member_user_ids: visibility === 'members' ? selectedMemberIds : [],
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <article className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Edit resource</h3>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-600"
            aria-label="Cancel edit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ResourceFormFields
          addMode={resource.type === 'link' ? 'link' : 'file'}
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
          pendingFile={null}
          onPickFile={() => {}}
        />
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void saveEdit()}
            loading={updateResource.isPending}
            disabled={
              !title.trim()
              || (resource.type === 'link' && !url.trim())
              || (visibility === 'members' && selectedMemberIds.length === 0)
            }
          >
            Save changes
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">{resource.title}</h3>
            {resource.group_name && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                {resource.group_name}
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
              {VISIBILITY_LABEL[resource.visibility]}
            </span>
          </div>
          {resource.description && (
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{resource.description}</p>
          )}
          <div className="mt-2">
            <PipelineUserAttribution user={resource.owner} timestamp={resource.created_at} />
          </div>
          {resource.visibility === 'members' && (resource.members?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Shared with</span>
              {resource.members!.map((member) => (
                <UserIdentityChip key={member.id} name={member.name} avatar={member.avatar} size="xs" />
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {resource.views_count} view{resource.views_count === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Download className="h-3.5 w-3.5" />
              {resource.downloads_count} download{resource.downloads_count === 1 ? '' : 's'}
            </span>
            {resource.file_size ? <span>{formatBytes(resource.file_size)}</span> : null}
            {resource.file_name && resource.type !== 'link' ? (
              <span className="max-w-[180px] truncate">{resource.file_name}</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
        <Button type="button" size="sm" variant="secondary" onClick={onOpen}>
          {resource.type === 'link' ? (
            <>
              <ExternalLink className="h-3.5 w-3.5" />
              Open link
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              View
            </>
          )}
        </Button>
        {resource.file_url && (
          <Button type="button" size="sm" variant="secondary" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        )}
        {resource.can_edit && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        {resource.can_delete && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>
      {resource.type === 'image' && resource.file_url && (
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
          <img src={resource.file_url} alt={resource.title} className="max-h-48 w-full object-contain" />
        </div>
      )}
    </article>
  );
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
  const [visibility, setVisibility] = useState<PipelineBoardResourceVisibility>('board');
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
    (['link', 'image', 'file'] as PipelineBoardResourceType[]).forEach((type) => {
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
            <LoadingSpinner />
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
