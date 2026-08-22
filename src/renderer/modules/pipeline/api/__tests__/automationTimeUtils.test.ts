import { describe, expect, it, vi, afterEach } from 'vitest';
import { localTimeToUtc, utcTimeToLocal } from '../automationTimeUtils';

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Locks the timezone contract: the builder stores UTC and renders local,
 * so a "09:00" local time in UTC+3 must round-trip to "06:00" UTC and back.
 */
describe('automationTimeUtils timezone round-trip', () => {
  it('converts a local time to UTC given a positive offset', () => {
    // Simulate a UTC+3 browser (e.g. Africa/Kampala).
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-180);
    expect(localTimeToUtc('09:00')).toBe('06:00');
    expect(localTimeToUtc('00:30')).toBe('21:30');
  });

  it('converts a local time to UTC given a negative offset', () => {
    // Simulate a UTC-5 browser (e.g. America/New_York in winter).
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(300);
    expect(localTimeToUtc('09:00')).toBe('14:00');
  });

  it('converts a UTC time back to local', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-180);
    expect(utcTimeToLocal('06:00')).toBe('09:00');
    expect(utcTimeToLocal('21:30')).toBe('00:30');
  });

  it('round-trips a local time through UTC and back unchanged', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-180);
    const local = '07:45';
    expect(utcTimeToLocal(localTimeToUtc(local))).toBe(local);
  });

  it('passes through malformed values untouched', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-180);
    expect(localTimeToUtc('')).toBe('');
    expect(localTimeToUtc('9am')).toBe('9am');
    expect(utcTimeToLocal('')).toBe('');
    expect(utcTimeToLocal('noon')).toBe('noon');
  });
});