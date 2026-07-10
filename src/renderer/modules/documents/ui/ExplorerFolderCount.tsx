import type { DocumentFolder } from '../api/documentTypes';
import { resolveFolderColor } from '../api/documentColorUtils';
import { surfaceColorAlpha } from '../../../shared/utils/surfaceStyles';
import { cn } from '../../../shared/utils/cn';

interface ExplorerFolderCountProps {
  folder: Pick<DocumentFolder, 'id' | 'cover_color' | 'document_count' | 'subfolder_count'>;
  className?: string;
}

function CountBadge({
  count,
  label,
  color,
  className,
}: {
  count: number;
  label: string;
  color: string;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white shadow-sm',
        className,
      )}
      style={{ backgroundColor: color }}
      title={label}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Notification-style circular counts for explorer folder rows. */
export function ExplorerFolderCount({ folder, className }: ExplorerFolderCountProps) {
  const files = folder.document_count ?? 0;
  const subfolders = folder.subfolder_count ?? 0;
  const accent = resolveFolderColor(folder);

  if (files === 0 && subfolders === 0) return null;

  return (
    <span className={cn('flex shrink-0 items-center gap-1', className)}>
      <CountBadge
        count={files}
        label={`${files} file${files === 1 ? '' : 's'}`}
        color={accent}
      />
      <CountBadge
        count={subfolders}
        label={`${subfolders} subfolder${subfolders === 1 ? '' : 's'}`}
        color={surfaceColorAlpha(accent, 0.72)}
      />
    </span>
  );
}
