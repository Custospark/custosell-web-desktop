import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import PlatformGuideCommunitiesPage from '../PlatformGuideCommunitiesPage';

const createMutate = vi.fn(async (payload: unknown) => ({ data: payload }));

vi.mock('../api/PlatformGuideQueries', () => ({
  usePlatformGuideCommunities: () => ({ data: [], isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }),
  useCreatePlatformGuideCommunity: () => ({ isPending: false, mutateAsync: createMutate }),
  useUpdatePlatformGuideCommunity: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeletePlatformGuideCommunity: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('../../../shared/components/Feedback/ConfirmContext', () => ({
  useConfirm: () => ({ confirm: vi.fn(async () => true) }),
}));

afterEach(() => {
  cleanup();
  createMutate.mockClear();
});

beforeEach(() => {
  vi.resetModules();
});

/**
 * Locks the custom-community platform flow: selecting "Custom…" reveals a blank
 * free-text input (never defaults to whatsapp) and the typed value is what gets
 * saved.
 */
describe('PlatformGuideCommunitiesPage custom platform', () => {
  it('selecting Custom shows an empty input and saves the typed community', async () => {
    render(<PlatformGuideCommunitiesPage />);

    fireEvent.click(screen.getByRole('button', { name: /Add Community/i }));

    // Fill required fields.
    fireEvent.change(screen.getByPlaceholderText('Custosell WhatsApp'), { target: { value: 'Custosell Signal' } });
    fireEvent.change(screen.getByPlaceholderText('https://chat.whatsapp.com/...'), { target: { value: 'https://signal.org/group/xyz' } });

    // Pick Custom from the platform select.
    fireEvent.change(screen.getByTitle('Platform') as HTMLSelectElement, { target: { value: '__custom__' } });

    // The custom input appears and is blank (not "whatsapp").
    const customInput = screen.getByPlaceholderText('e.g. Signal, Threads, Matrix') as HTMLInputElement;
    expect(customInput).toBeTruthy();
    expect(customInput.value).toBe('');

    // Type the custom community.
    fireEvent.change(customInput, { target: { value: 'Signal' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    const payload = createMutate.mock.calls[0][0] as { platform: string };
    expect(payload.platform).toBe('Signal');
  });

  it('switching back to a standard platform hides the custom input', () => {
    render(<PlatformGuideCommunitiesPage />);
    fireEvent.click(screen.getByRole('button', { name: /Add Community/i }));

    const select = screen.getByTitle('Platform') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__custom__' } });
    expect(screen.getByPlaceholderText('e.g. Signal, Threads, Matrix')).toBeTruthy();

    fireEvent.change(select, { target: { value: 'whatsapp' } });
    expect(screen.queryByPlaceholderText('e.g. Signal, Threads, Matrix')).toBeNull();
  });
});