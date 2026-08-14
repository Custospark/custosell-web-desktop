import { useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import type { CabinetVisibility, DocumentMemberRole } from '../api/documentTypes';
import { DOCUMENT_SURFACE } from '../../../shared/utils/surfaceStyles';
import { Button } from '../../../shared/components/buttons/Button';
import CabinetAccessBadges from './CabinetAccessBadges';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  FolderPlus,
  FolderUp,
  Link2,
  Palette,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';

interface DocumentExplorerToolbarProps {
  cabinetName?: string;
  cabinetVisibility?: CabinetVisibility;
  cabinetMemberRole?: DocumentMemberRole | null;
  searchQuery: string;
  tagFilter: string;
  online: boolean;
  canContribute: boolean;
  isViewerOnly?: boolean;
  onSearchChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onCreateLink: () => void;
  onImportFolder?: () => void;
  onRefresh: () => void;
  onCustomizeCanvas?: () => void;
  onCollapseAll: () => void;
}

/**
 * Collapsible documents toolbar - upload/import/folder/link actions plus search
 * and tag filter. The whole block can be collapsed to give the file tree more
 * working space; a toggle in the cabinet-name row restores it.
 */
export default function DocumentExplorerToolbar({
  cabinetName,
  cabinetVisibility,
  cabinetMemberRole,
  searchQuery,
  tagFilter,
  online,
  canContribute,
  isViewerOnly = false,
  onSearchChange,
  onTagFilterChange,
  onCreateFolder,
  onUpload,
  onCreateLink,
  onImportFolder,
  onRefresh,
  onCustomizeCanvas,
  onCollapseAll,
}: DocumentExplorerToolbarProps) {
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);

  return (
    <div className={cn('shrink-0 px-3 py-2.5', DOCUMENT_SURFACE.toolbar)}>
      {cabinetVisibility && (
        <div className="mb-2">
          <CabinetAccessBadges
            visibility={cabinetVisibility}
            memberRole={cabinetMemberRole}
          />
        </div>
      )}
      {isViewerOnly && (
        <p className="mb-2 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900">
          You have viewer access on this cabinet - you can browse and download, but cannot add or change files.
        </p>
      )}

      {!toolbarCollapsed && (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 justify-center px-1.5 text-[11px] sm:px-2 sm:text-xs"
            disabled={!online || !canContribute}
            onClick={onUpload}
            title="Upload a file"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
          {onImportFolder && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 justify-center px-1.5 text-[11px] sm:px-2 sm:text-xs"
              disabled={!online || !canContribute}
              onClick={onImportFolder}
              title="Import a folder with files"
            >
              <FolderUp className="h-3.5 w-3.5" />
              Import
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 justify-center px-1.5 text-[11px] sm:px-2 sm:text-xs"
            disabled={!online || !canContribute}
            onClick={onCreateFolder}
            title="Create a new folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Folder
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 justify-center px-1.5 text-[11px] sm:px-2 sm:text-xs"
            disabled={!online || !canContribute}
            onClick={onCreateLink}
            title="Add a web link"
          >
            <Link2 className="h-3.5 w-3.5" />
            Link
          </Button>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1">
        {cabinetName ? (
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800" title={cabinetName}>
            {cabinetName}
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <button
          type="button"
          title={toolbarCollapsed ? 'Show toolbar' : 'Hide toolbar'}
          onClick={() => setToolbarCollapsed((v) => !v)}
          className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/70 hover:text-indigo-600"
        >
          {toolbarCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
        {onCustomizeCanvas && (
          <button
            type="button"
            title="Customize canvas"
            onClick={onCustomizeCanvas}
            className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/70 hover:text-indigo-600"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          title="Refresh"
          onClick={onRefresh}
          className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/70 hover:text-gray-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Collapse all folders"
          onClick={onCollapseAll}
          className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/70 hover:text-gray-800"
        >
          <ChevronsDownUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {!toolbarCollapsed && (
        <div className="mt-2 space-y-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search files in this cabinet…"
              className="w-full rounded-lg border border-gray-300/90 bg-white/90 py-2 pl-9 pr-3 text-xs text-gray-900 shadow-sm outline-none backdrop-blur-sm placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-200"
            />
          </div>
          <input
            value={tagFilter}
            onChange={(e) => onTagFilterChange(e.target.value)}
            placeholder="Filter by tag (optional)"
            className="w-full rounded-lg border border-gray-300/90 bg-white/90 px-3 py-2 text-xs text-gray-900 shadow-sm outline-none backdrop-blur-sm placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-200"
          />
        </div>
      )}
    </div>
  );
}
