import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import type { DocumentFolder } from '../api/documentTypes';
import { truncateDisplayName } from '../api/documentDisplayUtils';
import { DocumentFolderCard, DocumentItemCard } from './DocumentItemViews';
import { DocumentProgressBar } from './DocumentProgressBar';
import { FolderPlus, Grid3X3, LayoutList, Link2, Search, Upload, WifiOff, Folder } from 'lucide-react';
import type { DocumentsPanelData, DocumentsPanelActions } from './useDocumentsPanel';

interface DocumentsPanelUIProps {
  data: DocumentsPanelData;
  actions: DocumentsPanelActions;
  online: boolean;
  loading: boolean;
  canContribute: boolean;
  showSidebar: boolean;
  onOpenCreateFolderModal: () => void;
  onOpenUploadModal: () => void;
  onOpenLinkModal: () => void;
}

export function DocumentsPanelToolbar({
  data, actions, online, canContribute, onOpenCreateFolderModal, onOpenUploadModal, onOpenLinkModal,
}: DocumentsPanelUIProps) {
  const { viewMode, search, title } = data;
  const { setViewMode, setSearch, setTagFilter } = actions;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-gray-900">{title}</h2>
          {!online && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
              <WifiOff className="h-3.5 w-3.5" /> Documents requires an internet connection
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
            <button type="button" className={cn('rounded-md p-2', viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500')} onClick={() => setViewMode('list')} title="List view">
              <LayoutList className="h-4 w-4" />
            </button>
            <button type="button" className={cn('rounded-md p-2', viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500')} onClick={() => setViewMode('grid')} title="Grid view">
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
          <Button type="button" variant="secondary" size="sm" disabled={!online || !canContribute} onClick={onOpenCreateFolderModal}>
            <FolderPlus className="h-4 w-4" /> Folder
          </Button>
          <Button type="button" size="sm" disabled={!online || !canContribute} onClick={onOpenUploadModal}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={!online || !canContribute} onClick={onOpenLinkModal}>
            <Link2 className="h-4 w-4" /> Link
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-b border-gray-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents, tags…" className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[160px]">
          <input onChange={(e) => setTagFilter(e.target.value)} placeholder="Filter by tag" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
        </div>
      </div>
    </>
  );
}

interface FileAreaProps {
  data: DocumentsPanelData;
  actions: DocumentsPanelActions;
  online: boolean;
  loading: boolean;
  showSidebar: boolean;
  canContribute: boolean;
}

export function DocumentsPanelFileArea({
  data, actions, online, loading, showSidebar, canContribute,
}: FileAreaProps) {
  const { subfolders, documents, contentLayoutClass, viewMode, dropTargetFolderId, panelDragActive, transfers, documentsMeta, canLoadMoreDocuments, isFetchingNextPage, contentsFetching } = data;
  const { setActiveFolderId, setDropTargetFolderId, setPanelDragActive, handlePanelDrop, handleFolderDrop, setPreviewDoc, handleDownload, handleDeleteDocument, handleMoveTargetChange, handleRenameTargetChange, setTagFilter, loadMoreDocuments } = actions;

  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5', panelDragActive && canContribute && 'bg-indigo-50/40')}
      onDragOver={(e) => { if (!canContribute || !online) return; e.preventDefault(); setPanelDragActive(true); setDropTargetFolderId('panel'); }}
      onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setPanelDragActive(false); if (dropTargetFolderId === 'panel') setDropTargetFolderId(null); }}
      onDrop={(e) => void handlePanelDrop(e)}
    >
      {panelDragActive && canContribute && (
        <div className="mb-3 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-center text-xs font-medium text-indigo-700">Drop files to upload, or drop items to move into this folder</div>
      )}
      {loading ? (
        <div className="flex justify-center py-10"><CustosellLoader /></div>
      ) : (
        <div className={contentLayoutClass}>
          {!showSidebar && subfolders.map((folder) => (
            <DocumentFolderCard key={`folder-${folder.id}`} folder={folder} viewMode={viewMode}
              isDropTarget={dropTargetFolderId === folder.id} onOpen={() => setActiveFolderId(folder.id)}
              onDelete={() => delFolder(actions, folder)}
              onMove={() => handleMoveTargetChange({ kind: 'folder', id: folder.id })}
              onRename={folder.can_manage ? () => handleRenameTargetChange({ kind: 'folder', id: folder.id, name: folder.name }) : undefined}
              onDragStart={() => undefined}
              onDragOver={(e) => { e.preventDefault(); setDropTargetFolderId(folder.id); }}
              onDragLeave={() => setDropTargetFolderId(null)}
              onDrop={(e) => void handleFolderDrop(folder.id, e)}
            />
          ))}
          {showSidebar && subfolders.length > 0 && (
            <div className={cn('col-span-full mb-1 flex flex-wrap gap-2', viewMode === 'grid' && 'mb-2')}>
              {subfolders.map((folder) => (
                <button key={`subfolder-${folder.id}`} type="button" onClick={() => setActiveFolderId(folder.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
                  <Folder className="h-3.5 w-3.5" />
                  <span title={folder.name}>{truncateDisplayName(folder.name, 32)}</span>
                </button>
              ))}
            </div>
          )}
          {documents.map((doc) => (
            <DocumentItemCard key={`doc-${doc.id}`} doc={doc} viewMode={viewMode} onPreview={() => setPreviewDoc(doc)}
              onDownload={() => void handleDownload(doc)} onDelete={() => { void handleDeleteDocument(doc); }}
              onMove={() => handleMoveTargetChange({ kind: 'document', id: doc.id })}
              onRename={(doc.can_edit || doc.can_manage) ? () => handleRenameTargetChange({ kind: 'document', id: doc.id, name: doc.title }) : undefined}
              onTagClick={setTagFilter} onDragStart={() => undefined}
            />
          ))}
          {subfolders.length === 0 && documents.length === 0 && (
            <div className={cn('rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center', viewMode === 'grid' && 'col-span-full')}>
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-3 text-sm font-medium text-gray-700">No documents yet</p>
              <p className="mt-1 text-xs text-gray-500">{showSidebar && !data.activeFolderId ? 'Browse all files, search by name, or open a folder on the left to upload.' : 'Drag files here to upload, or use the Upload button.'}</p>
            </div>
          )}
          {canLoadMoreDocuments && (
            <div className={cn('flex justify-center pt-2', viewMode === 'grid' && 'col-span-full')}>
              <Button type="button" variant="secondary" size="sm" loading={isFetchingNextPage || contentsFetching} onClick={loadMoreDocuments}>
                Load more{documentsMeta ? ` (${documents.length} of ${documentsMeta.total})` : ''}
              </Button>
            </div>
          )}
        </div>
      )}
      {transfers.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Transfers</p>
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <DocumentProgressBar key={transfer.id} label={`${transfer.kind === 'upload' ? 'Uploading' : 'Downloading'} ${transfer.name}`} percent={transfer.percent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function delFolder(actions: DocumentsPanelActions, folder: DocumentFolder) { void actions.handleDeleteFolder(folder); }

interface CardsViewProps {
  data: DocumentsPanelData; actions: DocumentsPanelActions; online: boolean; loading: boolean;
  canContribute: boolean; onOpenCreateFolderModal: () => void; onOpenUploadModal: () => void; onOpenLinkModal: () => void;
}

export function DocumentsPanelCardsView({ data, actions, online, loading, canContribute, onOpenCreateFolderModal, onOpenUploadModal, onOpenLinkModal }: CardsViewProps) {
  const { title, search, compact } = data;
  const { setSearch } = actions;

  return (
    <div className={cn('flex w-full flex-col', compact ? 'space-y-4 rounded-2xl border border-gray-200 bg-white p-4' : 'h-full min-h-0')}>
      {compact ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              {!online && <p className="mt-1 flex items-center gap-1 text-xs text-amber-700"><WifiOff className="h-3.5 w-3.5" /> Documents requires an internet connection</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={!online || !canContribute} onClick={onOpenCreateFolderModal}><FolderPlus className="h-4 w-4" /> Folder</Button>
              <Button type="button" size="sm" disabled={!online || !canContribute} onClick={onOpenUploadModal}><Upload className="h-4 w-4" /> Upload</Button>
            </div>
          </div>
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents, tags…" className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm" />
          </div>
        </>
      ) : (
        <DocumentsPanelToolbar data={data} actions={actions} online={online} loading={loading} canContribute={canContribute} showSidebar={false} onOpenCreateFolderModal={onOpenCreateFolderModal} onOpenUploadModal={onOpenUploadModal} onOpenLinkModal={onOpenLinkModal} />
      )}
      <DocumentsPanelFileArea data={data} actions={actions} online={online} loading={loading} showSidebar={false} canContribute={canContribute} />
    </div>
  );
}
