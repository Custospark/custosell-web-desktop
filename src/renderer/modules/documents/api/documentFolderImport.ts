import type { DocumentFolder, FolderVisibility } from './documentTypes';
import { DOCUMENTS_MAX_FOLDER_DEPTH } from './documentConstants';

type FileWithPath = File & { webkitRelativePath?: string };

export type FolderImportPayload = {
  name: string;
  visibility: FolderVisibility;
  parent_id: number | null;
  cabinet_id?: number | null;
};

export type ImportFolderTreeOptions = {
  files: FileList | File[];
  parentFolderId: number | null;
  /** Depth of the target parent folder (0 when importing at vault root). */
  parentDepth: number;
  visibility: FolderVisibility;
  maxDepth?: number;
  createFolder: (payload: FolderImportPayload) => Promise<DocumentFolder>;
  uploadFile: (file: File, folderId: number) => Promise<void>;
  onProgress?: (label: string, done: number, total: number) => void;
};

export type ImportFolderTreeResult = {
  foldersCreated: number;
  filesUploaded: number;
  skippedFiles: number;
  skippedFolders: number;
};

function relativePath(file: File): string {
  const withPath = file as FileWithPath;
  return withPath.webkitRelativePath?.trim() || file.name;
}

function splitPath(path: string): { folderSegments: string[]; fileName: string } {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) {
    return { folderSegments: [], fileName: path };
  }
  const fileName = parts[parts.length - 1] ?? path;
  const folderSegments = parts.slice(0, -1);
  return { folderSegments, fileName };
}

function folderPathsFromSegments(segments: string[]): string[] {
  const paths: string[] = [];
  for (let i = 1; i <= segments.length; i += 1) {
    paths.push(segments.slice(0, i).join('/'));
  }
  return paths;
}

export async function importFolderTree(options: ImportFolderTreeOptions): Promise<ImportFolderTreeResult> {
  const {
    files,
    parentFolderId,
    parentDepth,
    visibility,
    maxDepth = DOCUMENTS_MAX_FOLDER_DEPTH,
    createFolder,
    uploadFile,
    onProgress,
  } = options;

  const fileArray = Array.from(files);
  const parsed = fileArray
    .map((file) => ({ file, ...splitPath(relativePath(file)) }))
    .filter((entry) => entry.fileName.length > 0);

  const uniqueFolderPaths = new Set<string>();
  for (const entry of parsed) {
    for (const path of folderPathsFromSegments(entry.folderSegments)) {
      uniqueFolderPaths.add(path);
    }
  }

  const sortedFolderPaths = [...uniqueFolderPaths].sort(
    (a, b) => a.split('/').length - b.split('/').length,
  );

  const folderIdByPath = new Map<string, number | null>();
  folderIdByPath.set('', parentFolderId);

  let foldersCreated = 0;
  let skippedFolders = 0;

  for (const path of sortedFolderPaths) {
    const segments = path.split('/');
    const depthAfterCreate = parentDepth + segments.length;
    if (depthAfterCreate > maxDepth) {
      skippedFolders += 1;
      continue;
    }

    const parentPath = segments.slice(0, -1).join('/');
    const parentId = folderIdByPath.get(parentPath);
    if (parentId === undefined) {
      skippedFolders += 1;
      continue;
    }

    const name = segments[segments.length - 1] ?? path;
    onProgress?.(`Creating folder ${path}`, foldersCreated, sortedFolderPaths.length + parsed.length);

    const folder = await createFolder({
      name,
      visibility,
      parent_id: parentId,
    });

    folderIdByPath.set(path, folder.id);
    foldersCreated += 1;
  }

  let filesUploaded = 0;
  let skippedFiles = 0;
  const totalWork = sortedFolderPaths.length + parsed.length;

  for (let index = 0; index < parsed.length; index += 1) {
    const entry = parsed[index];
    const folderPath = entry.folderSegments.join('/');
    const targetFolderId = folderIdByPath.get(folderPath);

    if (targetFolderId == null) {
      skippedFiles += 1;
      continue;
    }

    const depthAfterUpload = parentDepth + entry.folderSegments.length;
    if (depthAfterUpload > maxDepth) {
      skippedFiles += 1;
      continue;
    }

    onProgress?.(`Uploading ${entry.fileName}`, foldersCreated + index + 1, totalWork);
    await uploadFile(entry.file, targetFolderId);
    filesUploaded += 1;
  }

  return { foldersCreated, filesUploaded, skippedFiles, skippedFolders };
}
