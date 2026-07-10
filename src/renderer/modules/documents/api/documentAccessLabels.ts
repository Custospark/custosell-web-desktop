import type { DocumentVisibility, FolderVisibility } from './documentTypes';

export type AccessVisibilityValue = DocumentVisibility | FolderVisibility;

export const DOCUMENT_ACCESS_OPTIONS: {
  value: AccessVisibilityValue;
  label: string;
  hint: string;
}[] = [
  { value: 'inherit', label: 'Same as folder', hint: 'Use the parent folder’s access settings' },
  { value: 'all_staff', label: 'Everyone on the team', hint: 'All staff with Documents can view and add files' },
  { value: 'selected_staff', label: 'Specific people', hint: 'Choose who can view, edit, or manage' },
  { value: 'owner_only', label: 'Only me', hint: 'Visible only to you' },
];

export const ACCESS_ROLE_OPTIONS: { value: 'viewer' | 'contributor' | 'manager'; label: string; hint: string }[] = [
  { value: 'viewer', label: 'Viewer', hint: 'Open and download only' },
  { value: 'contributor', label: 'Contributor', hint: 'Upload and manage your own files' },
  { value: 'manager', label: 'Manager', hint: 'Full control — access, folders, and deletions' },
];

export const ACCESS_VISIBILITY_LABEL: Record<AccessVisibilityValue, string> = {
  inherit: 'Same as folder',
  all_staff: 'Everyone on the team',
  selected_staff: 'Specific people',
  owner_only: 'Only me',
};
