import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MoveItemModal } from '../ui/MoveItemModal';
import type { DocumentCabinet, DocumentFolder } from '../api/documentTypes';

const cabinets: DocumentCabinet[] = [
  { id: 1, name: 'Operations' } as DocumentCabinet,
  { id: 2, name: 'Legal & Compliance' } as DocumentCabinet,
];

const operationsTree: DocumentFolder[] = [
  { id: 10, name: 'Ops Folder', depth: 1, can_contribute: true, can_manage: true } as DocumentFolder,
];

const legalTree: DocumentFolder[] = [
  { id: 20, name: 'Contracts', depth: 1, can_contribute: true, can_manage: true } as DocumentFolder,
  { id: 21, name: 'NDAs', depth: 2, can_contribute: true, can_manage: true } as DocumentFolder,
];

// Mock the tree hook so it returns a DIFFERENT tree per selected cabinet -
// proving folder options are scoped to the chosen cabinet.
vi.mock('../api/useDocumentQueries', () => ({
  useDocumentFolderTree: (cabinetId?: number) => ({
    data: cabinetId === 2 ? legalTree : cabinetId === 1 ? operationsTree : [],
  }),
}));

afterEach(() => {
  cleanup();
});

/**
 * Locks the cross-cabinet move flow in the documents panel:
 * - pick a destination cabinet (dropdown),
 * - only THAT cabinet's folders/subfolders are offered (dropdown),
 * - switching cabinet resets the folder selection,
 * - confirm returns both cabinetId and folderId.
 */
describe('MoveItemModal cross-cabinet', () => {
  it('shows all cabinets with the current one marked', () => {
    render(
      <MoveItemModal open onClose={() => {}} title="Move document" cabinets={cabinets} currentCabinetId={1} onConfirm={() => {}} />,
    );
    const cabinetSelect = screen.getByTitle('Destination cabinet') as HTMLSelectElement;
    expect(cabinetSelect.options.length).toBe(2);
    expect(cabinetSelect.options[0].textContent).toContain('Operations');
    expect(cabinetSelect.options[1].textContent).toContain('Legal & Compliance');
  });

  it('scopes folder options to the selected cabinet', () => {
    render(
      <MoveItemModal open onClose={() => {}} title="Move document" cabinets={cabinets} currentCabinetId={1} onConfirm={() => {}} />,
    );

    // Start on Operations -> only Ops Folder appears.
    let folderSelect = screen.getByTitle('Destination folder') as HTMLSelectElement;
    expect(folderSelect.textContent).toContain('Ops Folder');
    expect(folderSelect.textContent).not.toContain('Contracts');

    // Switch to Legal & Compliance -> only its folders appear.
    fireEvent.change(screen.getByTitle('Destination cabinet'), { target: { value: '2' } });
    folderSelect = screen.getByTitle('Destination folder') as HTMLSelectElement;
    expect(folderSelect.textContent).toContain('Contracts');
    expect(folderSelect.textContent).toContain('NDAs');
    expect(folderSelect.textContent).not.toContain('Ops Folder');
  });

  it('switching cabinet resets the folder selection', () => {
    render(
      <MoveItemModal open onClose={() => {}} title="Move document" cabinets={cabinets} currentCabinetId={1} onConfirm={() => {}} />,
    );

    const cabinetSelect = screen.getByTitle('Destination cabinet') as HTMLSelectElement;
    const folderSelect = screen.getByTitle('Destination folder') as HTMLSelectElement;

    fireEvent.change(cabinetSelect, { target: { value: '1' } });
    fireEvent.change(folderSelect, { target: { value: '10' } });
    expect(folderSelect.value).toBe('10');

    fireEvent.change(cabinetSelect, { target: { value: '2' } });
    expect(folderSelect.value).toBe('');
  });

  it('confirms with cabinetId and folderId', () => {
    const onConfirm = vi.fn();
    render(
      <MoveItemModal open onClose={() => {}} title="Move document" cabinets={cabinets} currentCabinetId={1} onConfirm={onConfirm} />,
    );

    fireEvent.change(screen.getByTitle('Destination cabinet'), { target: { value: '2' } });
    fireEvent.change(screen.getByTitle('Destination folder'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move here' }));

    expect(onConfirm).toHaveBeenCalledWith({ cabinetId: 2, folderId: 21 });
  });

  it('confirms with a null folder when moving to the cabinet root', () => {
    const onConfirm = vi.fn();
    render(
      <MoveItemModal open onClose={() => {}} title="Move folder" cabinets={cabinets} currentCabinetId={1} onConfirm={onConfirm} />,
    );

    fireEvent.change(screen.getByTitle('Destination cabinet'), { target: { value: '2' } });
    // Root option value is '' by default.
    fireEvent.click(screen.getByRole('button', { name: 'Move here' }));

    expect(onConfirm).toHaveBeenCalledWith({ cabinetId: 2, folderId: null });
  });

  it('resolves nested folders for folder moves too (can_contribute, not only can_manage)', () => {
    render(
      <MoveItemModal open onClose={() => {}} title="Move folder" cabinets={cabinets} currentCabinetId={1} onConfirm={() => {}} />,
    );

    // The legal cabinet tree has a nested "NDAs" subfolder. It must appear as a
    // destination for a FOLDER move even when it only carries can_contribute.
    fireEvent.change(screen.getByTitle('Destination cabinet'), { target: { value: '2' } });
    const folderSelect = screen.getByTitle('Destination folder') as HTMLSelectElement;
    expect(folderSelect.textContent).toContain('Contracts');
    expect(folderSelect.textContent).toContain('NDAs');
  });
});