/** Must match Backend `config/documents.php` default `max_depth`. */
export const DOCUMENTS_MAX_FOLDER_DEPTH = 10;

export function canCreateSubfolderAtDepth(depth: number): boolean {
  return depth < DOCUMENTS_MAX_FOLDER_DEPTH;
}
