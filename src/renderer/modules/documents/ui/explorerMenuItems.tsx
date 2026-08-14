import type { DocumentFolder, DocumentItem } from '../api/documentTypes';
import type { ExplorerMenuItem } from './ExplorerRowMenu';
import { canCreateSubfolderAtDepth } from '../api/documentConstants';
import {
  Download,
  FolderInput,
  FolderPlus,
  FolderUp,
  Link2,
  Mail,
  Palette,
  Pencil,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import type { DocumentExplorerActions } from './DocumentExplorer';

export function folderMenuItems(folder: DocumentFolder, actions: DocumentExplorerActions | undefined, online: boolean): ExplorerMenuItem[] {
  if (!actions) return [];
  const items: ExplorerMenuItem[] = [];

  if (actions.onUploadToFolder) {
    items.push({
      id: 'upload',
      label: 'Upload file here',
      icon: <Upload className="h-3.5 w-3.5" />,
      disabled: !online || !folder.can_contribute,
      onClick: () => actions.onUploadToFolder?.(folder.id),
    });
  }
  if (actions.onAddLinkToFolder) {
    items.push({
      id: 'link',
      label: 'Add link here',
      icon: <Link2 className="h-3.5 w-3.5" />,
      disabled: !online || !folder.can_contribute,
      onClick: () => actions.onAddLinkToFolder?.(folder.id),
    });
  }
  if (actions.onCreateSubfolder && canCreateSubfolderAtDepth(folder.depth)) {
    items.push({
      id: 'subfolder',
      label: 'New subfolder',
      icon: <FolderPlus className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onCreateSubfolder?.(folder),
    });
  }
  if (actions.onImportFolder) {
    items.push({
      id: 'import',
      label: 'Import folder here',
      icon: <FolderUp className="h-3.5 w-3.5" />,
      disabled: !online || !folder.can_contribute,
      onClick: () => actions.onImportFolder?.(folder.id),
    });
  }
  if (actions.onExportFolder && folder.can_view) {
    items.push({
      id: 'export',
      label: 'Download folder',
      icon: <Download className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onExportFolder?.(folder),
    });
  }
  if (actions.onEmailFolder && folder.can_view) {
    items.push({
      id: 'email',
      label: 'Email folder',
      icon: <Mail className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onEmailFolder?.(folder),
    });
  }
  if (actions.onManageFolderAccess && folder.can_manage) {
    items.push({
      id: 'access',
      label: 'Manage access',
      icon: <Shield className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onManageFolderAccess?.(folder),
    });
  }
  if (actions.onSetFolderColor && folder.can_manage) {
    items.push({
      id: 'color',
      label: 'Folder color',
      icon: <Palette className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onSetFolderColor?.(folder),
    });
  }
  if (actions.onRenameFolder && folder.can_manage) {
    items.push({
      id: 'rename',
      label: 'Rename folder',
      icon: <Pencil className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onRenameFolder?.(folder),
    });
  }
  if (actions.onMoveFolder && folder.can_manage) {
    items.push({
      id: 'move',
      label: 'Move folder',
      icon: <FolderInput className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onMoveFolder?.(folder),
    });
  }
  if (actions.onDeleteFolder && folder.can_delete) {
    items.push({
      id: 'delete',
      label: 'Delete folder',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      disabled: !online,
      danger: true,
      onClick: () => actions.onDeleteFolder?.(folder),
    });
  }

  return items;
}

export function documentMenuItems(doc: DocumentItem, actions: DocumentExplorerActions | undefined, online: boolean): ExplorerMenuItem[] {
  if (!actions) return [];
  const items: ExplorerMenuItem[] = [];

  if (actions.onManageDocumentAccess && doc.can_manage) {
    items.push({
      id: 'access',
      label: 'Manage access',
      icon: <Shield className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onManageDocumentAccess?.(doc),
    });
  }
  if (actions.onRenameDocument && (doc.can_edit || doc.can_manage)) {
    items.push({
      id: 'rename',
      label: 'Rename',
      icon: <Pencil className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onRenameDocument?.(doc),
    });
  }
  if (actions.onMoveDocument && (doc.can_edit || doc.can_manage)) {
    items.push({
      id: 'move',
      label: 'Move to folder',
      icon: <FolderInput className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onMoveDocument?.(doc),
    });
  }
  if (actions.onEmailDocument && doc.can_view) {
    items.push({
      id: 'email',
      label: 'Email document',
      icon: <Mail className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onEmailDocument?.(doc),
    });
  }
  if (actions.onDeleteDocument && doc.can_delete) {
    items.push({
      id: 'delete',
      label: 'Delete document',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      disabled: !online,
      danger: true,
      onClick: () => actions.onDeleteDocument?.(doc),
    });
  }

  return items;
}
