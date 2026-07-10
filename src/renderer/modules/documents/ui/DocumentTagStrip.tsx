import { resolveTagColor } from '../api/documentColorUtils';
import type { DocumentTag } from '../api/documentTypes';
import { cn } from '../../../shared/utils/cn';

interface DocumentTagStripProps {
  tags: DocumentTag[];
  className?: string;
}

export function DocumentTagStrip({ tags, className }: DocumentTagStripProps) {
  if (!tags.length) return null;

  return (
    <div className={cn('flex min-w-0 gap-0.5', className)}>
      {tags.slice(0, 4).map((tag) => (
        <span
          key={tag.id}
          title={tag.name}
          className="h-1.5 min-w-[1.25rem] flex-1 rounded-full"
          style={{ backgroundColor: resolveTagColor(tag) }}
        />
      ))}
    </div>
  );
}

interface DocumentTagChipsProps {
  tags: DocumentTag[];
  className?: string;
}

export function DocumentTagChips({ tags, className }: DocumentTagChipsProps) {
  if (!tags.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="rounded-md px-2 py-0.5 text-[10px] font-medium text-white shadow-sm"
          style={{ backgroundColor: resolveTagColor(tag) }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
