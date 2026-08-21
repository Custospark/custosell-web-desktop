import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock the data hook + loader so we can render the page in isolation.
vi.mock('../api/useBookingQueries', () => ({
  useCheckBooking: () => ({
    data: {
      business_name: 'Acme',
      board_name: 'Sales',
      business_email: null,
      business_phone: null,
      business_address: null,
      business_city: null,
      business_state: null,
      business_postal_code: null,
      business_country: null,
      reference_code: 'ABC123',
      booking_status: 'pending',
      rejection_reason: null,
      name: 'Jane',
      email: null,
      phone: null,
      start_date: '2026-08-22T10:00:00.000Z',
      end_date: '2026-08-22T10:30:00.000Z',
      meeting_link: null,
      notes: null,
      approved_at: null,
      rejected_at: null,
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../shared/components/loading/CustosellLoader', () => ({
  CustosellLoader: ({ message }: { message?: string }) => <div>{message ?? 'Loading'}</div>,
}));

afterEach(() => {
  cleanup();
});

describe('PublicBookingCheckPage', () => {
  it('renders without crashing for the check API shape', async () => {
    const { default: PublicBookingCheckPage } = await import('../pages/PublicBookingCheckPage');
    render(
      <MemoryRouter initialEntries={['/book/tok/check/ABC123']}>
        <Routes>
          <Route path="/book/:token/check/:reference" element={<PublicBookingCheckPage />} />
        </Routes>
      </MemoryRouter>,
    );
    // Should show the business + status, not crash.
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
  });
});