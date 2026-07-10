import type { LucideIcon } from 'lucide-react';
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  Link2,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { DocumentItem } from '../api/documentTypes';
import { type FileIconKind, resolveDocumentIconKind } from '../api/documentDisplayUtils';

const ICONS: Record<FileIconKind, { Icon: LucideIcon; className: string }> = {
  folder: { Icon: Folder, className: 'text-amber-500' },
  'folder-open': { Icon: FolderOpen, className: 'text-amber-500' },
  pdf: { Icon: FileText, className: 'text-red-500' },
  word: { Icon: FileText, className: 'text-blue-600' },
  excel: { Icon: FileSpreadsheet, className: 'text-emerald-600' },
  image: { Icon: FileImage, className: 'text-violet-500' },
  video: { Icon: FileVideo, className: 'text-pink-500' },
  audio: { Icon: FileAudio, className: 'text-orange-500' },
  archive: { Icon: FileArchive, className: 'text-yellow-600' },
  code: { Icon: FileCode, className: 'text-sky-600' },
  link: { Icon: Link2, className: 'text-indigo-500' },
  generic: { Icon: File, className: 'text-gray-500' },
};

interface DocumentFileIconProps {
  kind: FileIconKind;
  className?: string;
  size?: 'sm' | 'md';
}

export function DocumentFileIcon({ kind, className, size = 'sm' }: DocumentFileIconProps) {
  const spec = ICONS[kind];
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const { Icon } = spec;

  return <Icon className={cn(sizeClass, 'shrink-0', spec.className, className)} aria-hidden />;
}

export function DocumentItemIcon({
  doc,
  className,
  size = 'sm',
}: {
  doc: DocumentItem;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return <DocumentFileIcon kind={resolveDocumentIconKind(doc)} className={className} size={size} />;
}

export function DocumentFolderIcon({
  open = false,
  className,
  size = 'sm',
}: {
  open?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return <DocumentFileIcon kind={open ? 'folder-open' : 'folder'} className={className} size={size} />;
}
