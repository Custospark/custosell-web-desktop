const STORAGE_KEY = 'custosell-pipeline-board-uploads-v1';

function readAll(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, string[]>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadBoardUploadHistory(boardId: number, currentPath?: string | null): string[] {
  const key = String(boardId);
  const stored = readAll()[key] ?? [];
  const paths = [...stored];
  if (currentPath?.trim()) {
    const normalized = currentPath.trim();
    if (!paths.includes(normalized)) paths.unshift(normalized);
  }
  return paths;
}

export function addBoardUploadHistory(boardId: number, path: string): string[] {
  const key = String(boardId);
  const all = readAll();
  const existing = all[key] ?? [];
  const next = [path, ...existing.filter((p) => p !== path)].slice(0, 12);
  all[key] = next;
  writeAll(all);
  return next;
}
