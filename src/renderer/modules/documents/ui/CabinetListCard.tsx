import { Link } from 'react-router-dom';
import { Archive, Star } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { DocumentCabinet } from '../api/documentTypes';
import { CABINET_VISIBILITY_META, cabinetCardHeroStyle, cabinetColorAlpha } from './cabinetMeta';

export interface CabinetListCardProps {
  cabinet: DocumentCabinet;
  to?: string;
  onSelect?: () => void;
  isActive?: boolean;
  showVisibility?: boolean;
  variant?: 'default' | 'compact';
}

function CabinetListCardContent({
  cabinet,
  showVisibility,
  isActive,
  variant = 'default',
}: {
  cabinet: DocumentCabinet;
  showVisibility: boolean;
  isActive?: boolean;
  variant?: 'default' | 'compact';
}) {
  const accent = cabinet.cover_color ?? '#6366f1';
  const heroStyle = cabinetCardHeroStyle(cabinet);
  const folderCount = cabinet.folder_count ?? 0;
  const documentCount = cabinet.document_count ?? 0;
  const isGeneral = cabinet.name === 'General';
  const vis = showVisibility ? CABINET_VISIBILITY_META[cabinet.visibility] : null;

  if (variant === 'compact') {
    return (
      <article
        className={cn(
          'flex items-center gap-2.5 overflow-hidden rounded-lg border bg-white px-2.5 py-2 shadow-sm',
          'transition-all duration-150 ease-out',
          'group-hover:border-indigo-200 group-hover:shadow',
          isActive
            ? 'border-indigo-400 bg-indigo-50/80 ring-1 ring-indigo-300/60'
            : 'border-gray-200/90',
        )}
      >
        <div
          className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-black/5"
          style={heroStyle}
        >
          <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: accent }} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 truncate text-sm font-medium text-gray-900 group-hover:text-indigo-800">
            {cabinet.name}
            {isGeneral && (
              <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" aria-label="Default cabinet" />
            )}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
            {vis && (
              <span className={cn('inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium', vis.className)}>
                <vis.icon className="h-2.5 w-2.5" />
                {vis.label}
              </span>
            )}
            <span>{folderCount} folders · {documentCount} files</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm',
        'transition-all duration-200 ease-out',
        'group-hover:-translate-y-0.5 group-hover:shadow-lg',
        isActive && 'ring-2 ring-indigo-500 ring-offset-2',
      )}
      style={{ borderColor: cabinetColorAlpha(accent, isActive ? 0.5 : 0.28) }}
    >
      <div className="relative h-28 shrink-0 overflow-hidden" style={heroStyle}>
        <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
        <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white shadow-sm ring-1 ring-white/30 backdrop-blur-sm transition-transform duration-200 group-hover:scale-105">
          <Archive className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 truncate font-semibold text-gray-900 group-hover:text-blue-700">
            {cabinet.name}
            {isGeneral && (
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Default cabinet" />
            )}
          </h3>
          {cabinet.description && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">{cabinet.description}</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {vis && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', vis.className)}>
              <vis.icon className="h-3 w-3" />
              {vis.label}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-0.5 font-medium text-gray-600">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
            {folderCount} folders · {documentCount} files
          </span>
        </div>
      </div>
    </article>
  );
}

export default function CabinetListCard({
  cabinet,
  to,
  onSelect,
  isActive,
  showVisibility = false,
  variant = 'default',
}: CabinetListCardProps) {
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className="group block w-full text-left">
        <CabinetListCardContent
          cabinet={cabinet}
          showVisibility={showVisibility}
          isActive={isActive}
          variant={variant}
        />
      </button>
    );
  }

  if (!to) return null;

  return (
    <Link to={to} className="group block h-full">
      <CabinetListCardContent
        cabinet={cabinet}
        showVisibility={showVisibility}
        isActive={isActive}
        variant={variant}
      />
    </Link>
  );
}
