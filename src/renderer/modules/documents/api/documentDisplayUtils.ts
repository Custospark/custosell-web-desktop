/** Truncate long names for UI while preserving full text in tooltips. */
export function truncateDisplayName(name: string, maxLength = 48): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const head = Math.ceil((maxLength - 1) / 2);
  const tail = Math.floor((maxLength - 1) / 2);

  return `${trimmed.slice(0, head)}…${trimmed.slice(-tail)}`;
}

export function documentPrimaryLabel(doc: { title: string; file_name?: string | null }): string {
  return doc.title?.trim() || doc.file_name?.trim() || 'Untitled';
}

export function documentSecondaryLabel(doc: { title: string; file_name?: string | null }): string | null {
  const fileName = doc.file_name?.trim();
  const title = doc.title?.trim();
  if (!fileName || !title || fileName === title) return null;
  return fileName;
}
