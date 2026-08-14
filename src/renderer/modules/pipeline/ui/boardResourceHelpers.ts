import type {
  PipelineBoardResource,
  PipelineBoardResourceType,
  PipelineBoardResourceVisibility,
} from '../api/pipelineTypes';

export type AddMode = 'file' | 'link';
export type GroupFilter = 'all' | PipelineBoardResourceType | string;

export interface ResourceGroup {
  key: string;
  label: string;
  items: PipelineBoardResource[];
}

export const VISIBILITY_OPTIONS: { value: PipelineBoardResourceVisibility; label: string; hint: string }[] = [
  { value: 'board', label: 'Everyone on board', hint: 'Anyone who can view this board' },
  { value: 'team', label: 'Board team', hint: 'Board creator and invited team members' },
  { value: 'members', label: 'Selected members', hint: 'Pick specific board members below' },
  { value: 'owner_only', label: 'Only me', hint: 'Visible only to you' },
];

export const VISIBILITY_LABEL: Record<PipelineBoardResourceVisibility, string> = {
  board: 'Board',
  team: 'Team',
  members: 'Selected',
  owner_only: 'Private',
};

export const TYPE_LABEL: Record<PipelineBoardResourceType, string> = {
  link: 'Links',
  image: 'Images',
  file: 'Files',
};

export function formatBytes(size?: number | null): string {
  if (!size || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function resourceMatchesSearch(resource: PipelineBoardResource, query: string): boolean {
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

export function buildResourceGroups(resources: PipelineBoardResource[], filter: GroupFilter): ResourceGroup[] {
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
