import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import ManualPaymentVerify from '../ManualPaymentVerify';

/**
 * Self-serve payment sync — the manual "I've Completed Payment — Verify" control
 * must:
 *   1. POST to /billing/payments/{id}/confirm (the same endpoint the payment
 *      history 'Sync payment' button uses).
 *   2. On success, notify the caller (onVerified) AND invalidate the profile +
 *      subscription-access queries so the UI refetches and grants access —
 *      exactly what happens when the webhook auto-approves the payment.
 */

vi.mock('../../../../app/api/axiosConfig', () => ({
  axiosInstance: {
    post: vi.fn(),
  },
}));

const axiosMock = vi.mocked(axiosInstance);

function renderVerify() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onVerified = vi.fn();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ManualPaymentVerify paymentId={42} onVerified={onVerified} />
    </QueryClientProvider>,
  );
  return { queryClient, onVerified, ...view };
}

const verifyButton = () => screen.getByRole('button', { name: 'I\'ve Completed Payment — Verify' });

describe('ManualPaymentVerify (self-serve payment sync)', () => {
  beforeEach(() => {
    axiosMock.post.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('POSTs the confirm endpoint with the payment id', async () => {
    axiosMock.post.mockResolvedValue({ data: { success: true, message: 'Payment confirmed. Subscription activated.' } });
    const { onVerified } = renderVerify();

    fireEvent.click(verifyButton());

    await waitFor(() => expect(axiosMock.post).toHaveBeenCalledWith('/billing/payments/42/confirm'));
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
  });

  it('invalidates profile + subscription queries after success so access updates', async () => {
    axiosMock.post.mockResolvedValue({ data: { success: true, message: 'Payment confirmed. Subscription activated.' } });
    const { queryClient } = renderVerify();

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(verifyButton());

    await waitFor(() => {
      expect(axiosMock.post).toHaveBeenCalledWith('/billing/payments/42/confirm');
    });

    const keys = invalidateSpy.mock.calls
      .map(([opts]) => (Array.isArray(opts) ? opts : opts?.queryKey))
      .filter(Boolean)
      .map((k) => (Array.isArray(k) ? k.join('/') : String(k)));

    expect(keys.some((k) => k.includes('account/profile'))).toBe(true);
    expect(keys.some((k) => k.includes('subscription/access'))).toBe(true);
    expect(keys.some((k) => k.includes('subscription/current'))).toBe(true);
  });

  it('shows the backend message when the gateway has not yet confirmed', async () => {
    axiosMock.post.mockResolvedValue({ data: { success: false, message: 'Payment not yet confirmed.' } });
    renderVerify();

    fireEvent.click(verifyButton());

    await waitFor(() => expect(screen.getByText('Payment not yet confirmed.')).toBeTruthy());
  });

  it('surfaces an error message when the network call fails', async () => {
    axiosMock.post.mockRejectedValue({ response: { data: { message: 'Gateway unreachable.' } } });
    renderVerify();

    fireEvent.click(verifyButton());

    await waitFor(() => expect(screen.getByText('Gateway unreachable.')).toBeTruthy());
  });
});
