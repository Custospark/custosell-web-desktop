import type { DocumentFolder } from '../api/documentTypes';
import { cn } from '../../../shared/utils/cn';

interface ExplorerFolderCountProps {
  folder: Pick<DocumentFolder, 'document_count' | 'subfolder_count'>;
  className?: string;
}

/** Compact file / subfolder counts for explorer rows. */
export function ExplorerFolderCount({ folder, className }: ExplorerFolderCountProps) {
  const files = folder.document_count ?? 0;
  const subfolders = folder.subfolder_count ?? 0;

  if (files === 0 && subfolders === 0) return null;

  return (
    <span
      className={cn(
        'ml-1 inline-flex shrink-0 items-baseline gap-0.5 tabular-nums text-[10px] font-medium leading-none text-gray-400',
        className,
      )}
      title={[
        files > 0 ? `${files} file${files === 1 ? '' : 's'}` : null,
        subfolders > 0 ? `${subfolders} subfolder${subfolders === 1 ? '' : 's'}` : null,
      ].filter(Boolean).join(' · ')}
    >
      {files > 0 && <sup className="text-[10px] text-gray-500">{files}</sup>}
      {subfolders > 0 && (
        <sup className="text-[9px] text-gray-400">{files > 0 ? `+${subfolders}` : subfolders}</sup>
      )}
    </span>
  );
}
