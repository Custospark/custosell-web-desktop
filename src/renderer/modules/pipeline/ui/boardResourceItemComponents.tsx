import { useMemo, useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { cn } from '../../../shared/utils/cn';
import type { PipelineBoardResource, PipelineBoardResourceVisibility, PipelineUserRef } from '../api/pipelineTypes';
import { PipelineUserAttribution } from './pipelineUserAttribution';
import { pipelineInputClass } from './pipelineFormFields';
import { useUpdateBoardResource } from '../api/usePipelineResourceQueries';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Link2,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { VISIBILITY_OPTIONS, VISIBILITY_LABEL, formatBytes, type AddMode } from './boardResourceHelpers';

export function ResourceTypeIcon({ type, className }: { type: PipelineBoardResource['type']; className?: string }) {
  if (type === 'link') return <Link2 className={className} />;
  if (type === 'image') return <ImageIcon className={className} />;
  return <FileText className={className} />;
}

export function MemberPicker({
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

export function ResourceFormFields({
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
        placeholder={addMode === 'link' ? 'Link title' : 'Title (optional - uses file name)'}
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

export function ResourceRow({
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
          <ResourceTypeIcon type={resource.type} className="h-5 w-5" />
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
