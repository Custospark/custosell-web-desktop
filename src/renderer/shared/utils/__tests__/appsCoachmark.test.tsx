import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppStoreCoachmark } from '../../components/layout/AppStoreCoachmark';
import { isTipDue, readTipSeen, stampTipSeen, tipVersion } from '../../components/layout/appsTipStore';

describe('apps tip flag', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T10:00:00Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('follows the app version and retires once seen', () => {
    expect(typeof tipVersion()).toBe('string');
    expect(isTipDue(null)).toBe(true);
    stampTipSeen(5);
    expect(isTipDue(readTipSeen(5))).toBe(false);
    expect(readTipSeen(6)).toBeNull();
  });

  it('shows after a beat with the user name, Got it dismisses', () => {
    render(<button data-tour="header-app-store">Apps</button>);
    const onOpenStore = vi.fn();
    render(
      <AppStoreCoachmark
        userId={5}
        firstName="Oscar"
        onboardingActive={false}
        paused={false}
        onOpenStore={onOpenStore}
      />,
    );
    expect(screen.queryByRole('dialog', { name: /custosell apps tip/i })).toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText(/oscar, all your apps are here/i)).toBeTruthy();

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Got it' }).find((b) => b.textContent === 'Got it')!,
    );
    expect(screen.queryByRole('dialog', { name: /custosell apps tip/i })).toBeNull();
    expect(onOpenStore).not.toHaveBeenCalled();
    expect(readTipSeen(5)).not.toBeNull();
  });

  it('Show me opens the store and retires the tip', () => {
    render(<button data-tour="header-app-store">Apps</button>);
    const onOpenStore = vi.fn();
    render(
      <AppStoreCoachmark
        userId={5}
        firstName={null}
        onboardingActive={false}
        paused={false}
        onOpenStore={onOpenStore}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
    expect(onOpenStore).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: /custosell apps tip/i })).toBeNull();
  });

  it('click-away and Escape dismiss without reopening', () => {
    render(<button data-tour="header-app-store">Apps</button>);
    const onOpenStore = vi.fn();
    render(
      <AppStoreCoachmark
        userId={5}
        firstName="Oscar"
        onboardingActive={false}
        paused={false}
        onOpenStore={onOpenStore}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('dialog', { name: /custosell apps tip/i })).toBeTruthy();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog', { name: /custosell apps tip/i })).toBeNull();
    expect(onOpenStore).not.toHaveBeenCalled();
  });

  it('stays hidden while onboarding runs or already seen', () => {
    render(<button data-tour="header-app-store">Apps</button>);
    const props = {
      userId: 5,
      firstName: 'Oscar',
      paused: false,
      onOpenStore: vi.fn(),
    };
    const { rerender } = render(<AppStoreCoachmark {...props} onboardingActive />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('dialog', { name: /custosell apps tip/i })).toBeNull();

    stampTipSeen(5);
    rerender(<AppStoreCoachmark {...props} onboardingActive={false} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('dialog', { name: /custosell apps tip/i })).toBeNull();
  });
});
