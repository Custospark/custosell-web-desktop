import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import type { DocumentFolder, DocumentItem } from '../api/documentTypes';
import { documentPrimaryLabel, documentSecondaryLabel, truncateDisplayName } from '../api/documentDisplayUtils';
import { canPreviewDocument, formatDocumentBytes } from '../api/documentTransferUtils';
import { DocumentMemberStack } from './DocumentMemberStack';
import { DocumentUserAttribution } from './DocumentUserAttribution';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  FolderInput,
  Image as ImageIcon,
  Link2,
  Trash2,
  Pencil,
} from 'lucide-react';

function DocumentTypeIcon({ type }: { type: DocumentItem['type'] }) {
  if (type === 'link') return <Link2 className="h-4 w-4" />;
  if (type === 'image') return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

interface DocumentTagsProps {
  doc: DocumentItem;
  onTagClick: (tag: string) => void;
}

function DocumentTags({ doc, onTagClick }: DocumentTagsProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
      <span>{formatDocumentBytes(doc.file_size)}</span>
      {doc.visibility === 'inherit' && doc.inherited_from_folder_id && (
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">Inherited</span>
      )}
      {doc.customer && (
        <Link to={`${ROUTES.CUSTOMERS.INDEX}?highlight=${doc.customer.id}`} className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
          {doc.customer.name}
        </Link>
      )}
      {doc.project && (
        <Link to={ROUTES.ESTIMATES.PROJECT_DETAIL(doc.project.id)} className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
          {doc.project.name}
        </Link>
      )}
      {doc.tags?.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 hover:bg-gray-200"
          onClick={() => onTagClick(tag.name)}
        >
          #{tag.name}
        </button>
      ))}
    </div>
  );
}

interface DocumentFolderCardProps {
  folder: DocumentFolder;
  viewMode: 'list' | 'grid';
  isDropTarget: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onMove: () => void;
  onRename?: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

export function DocumentFolderCard({
  folder,
  viewMode,
  isDropTarget,
  onOpen,
  onDelete,
  onMove,
  onRename,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: DocumentFolderCardProps) {
  const displayName = truncateDisplayName(folder.name);

  return (
    <div
      draggable={folder.can_manage}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/document-folder-id', String(folder.id));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        viewMode === 'grid'
          ? 'flex h-full flex-col rounded-xl border bg-white p-4'
          : 'flex items-center justify-between rounded-xl border bg-white px-4 py-3',
        isDropTarget ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200' : 'border-gray-200',
      )}
    >
      <button type="button" className={cn('flex min-w-0 flex-1 items-center gap-3 text-left', viewMode === 'grid' && 'flex-col items-start')} onClick={onOpen}>
        <div className="rounded-lg bg-amber-50 p-2 text-amber-700"><Folder className="h-4 w-4" /></div>
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900" title={folder.name}>{displayName}</p>
          <DocumentUserAttribution user={folder.creator} timestamp={folder.created_at} />
        </div>
      </button>
      <div className={cn('flex items-center gap-2', viewMode === 'grid' && 'mt-3 w-full justify-between')}>
        <DocumentMemberStack members={folder.members} />
        {folder.can_manage && (
          <>
            {onRename && (
              <Button type="button" variant="ghost" size="sm" onClick={onRename} title="Rename folder">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={onMove} title="Move folder">
              <FolderInput className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDelete} title="Delete folder">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface DocumentItemCardProps {
  doc: DocumentItem;
  viewMode: 'list' | 'grid';
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onMove: () => void;
  onRename?: () => void;
  onTagClick: (tag: string) => void;
  onDragStart: () => void;
}

export function DocumentItemCard({
  doc,
  viewMode,
  onPreview,
  onDownload,
  onDelete,
  onMove,
  onRename,
  onTagClick,
  onDragStart,
}: DocumentItemCardProps) {
  const previewable = canPreviewDocument(doc);
  const primaryLabel = documentPrimaryLabel(doc);
  const secondaryLabel = documentSecondaryLabel(doc);
  const displayTitle = truncateDisplayName(primaryLabel);

  return (
    <div
      draggable={doc.can_edit || doc.can_manage}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/document-id', String(doc.id));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      className={cn(
        'rounded-xl border border-gray-200 bg-white',
        viewMode === 'grid' ? 'flex h-full flex-col p-4' : 'px-4 py-3',
      )}
    >
      <div className={cn('flex gap-3', viewMode === 'grid' ? 'flex-col' : 'items-start justify-between')}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-700"><DocumentTypeIcon type={doc.type} /></div>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              className="block max-w-full truncate text-left font-medium text-gray-900 hover:text-indigo-700"
              title={primaryLabel}
              onClick={previewable ? onPreview : onDownload}
            >
              {displayTitle}
            </button>
            {secondaryLabel && (
              <p className="mt-0.5 truncate text-xs text-gray-500" title={secondaryLabel}>
                {truncateDisplayName(secondaryLabel, 56)}
              </p>
            )}
            <DocumentUserAttribution user={doc.uploader} timestamp={doc.updated_at ?? doc.created_at} />
            <DocumentTags doc={doc} onTagClick={onTagClick} />
          </div>
        </div>
        <div className={cn('flex items-center gap-2', viewMode === 'grid' && 'mt-3 w-full justify-between border-t border-gray-100 pt-3')}>
          <DocumentMemberStack members={doc.members} />
          {previewable && (
            <Button type="button" variant="ghost" size="sm" onClick={onPreview} title="Preview">
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {doc.type === 'link' && doc.url && (
            <Button type="button" variant="ghost" size="sm" onClick={() => window.open(doc.url!, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {doc.file_url && (
            <Button type="button" variant="ghost" size="sm" onClick={onDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
          )}
          {(doc.can_edit || doc.can_manage) && (
            <>
              {onRename && (
                <Button type="button" variant="ghost" size="sm" onClick={onRename} title="Rename">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={onMove} title="Move">
              <FolderInput className="h-4 w-4" />
            </Button>
            </>
          )}
          {doc.can_delete && (
            <Button type="button" variant="ghost" size="sm" onClick={onDelete} title="Delete">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
