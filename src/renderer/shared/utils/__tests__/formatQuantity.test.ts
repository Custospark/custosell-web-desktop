import { describe, expect, it } from 'vitest';
import { formatQuantity } from '../formatQuantity';

/**
 * Locks the quantity formatting contract:
 *  - legacy whole-number quantities render without decimals (2, not 2.000)
 *  - fractional weight/volume quantities keep up to 3 decimals (0.5, 1.25)
 *  - null/undefined/garbage never crash and never render NaN
 */
describe('formatQuantity', () => {
  it('renders whole numbers without decimals', () => {
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(2.0)).toBe('2');
    expect(formatQuantity('2')).toBe('2');
    expect(formatQuantity(10)).toBe('10');
  });

  it('renders fractional quantities with up to 3 decimals', () => {
    expect(formatQuantity(0.5)).toBe('0.5');
    expect(formatQuantity(1.25)).toBe('1.25');
    expect(formatQuantity(0.1)).toBe('0.1');
    expect(formatQuantity(2.75)).toBe('2.75');
  });

  it('rounds long decimals to 3 places', () => {
    expect(formatQuantity(1.23456)).toBe('1.235');
    expect(formatQuantity(0.33333)).toBe('0.333');
  });

  it('handles legacy integer values that are strings', () => {
    expect(formatQuantity('3')).toBe('3');
    expect(formatQuantity('3.000')).toBe('3');
  });

  it('never crashes on null, undefined, or garbage', () => {
    expect(formatQuantity(null)).toBe('0');
    expect(formatQuantity(undefined)).toBe('0');
    expect(formatQuantity('')).toBe('0');
    expect(formatQuantity('abc')).toBe('0');
    expect(formatQuantity(NaN)).toBe('0');
  });
});