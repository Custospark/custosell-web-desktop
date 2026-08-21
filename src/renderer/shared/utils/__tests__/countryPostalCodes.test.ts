import { describe, expect, it } from 'vitest';
import { suggestedPostalCode, findCountryByCode, findCountryByName } from '../countryCodes';

/**
 * Locks postal-code auto-fill: selecting a country returns a representative
 * postal code (or null for unknown countries), and resolution works by both
 * ISO code and country name.
 */
describe('suggestedPostalCode', () => {
  it('returns a postal code for East African countries', () => {
    expect(suggestedPostalCode('UG')).toBe('25600');
    expect(suggestedPostalCode('KE')).toBe('00100');
    expect(suggestedPostalCode('TZ')).toBe('11000');
    expect(suggestedPostalCode('RW')).toBe('KG 110');
  });

  it('resolves by country name too', () => {
    expect(suggestedPostalCode('Uganda')).toBe('25600');
    expect(suggestedPostalCode('United States')).toBe('10001');
  });

  it('returns null for unknown or empty input', () => {
    expect(suggestedPostalCode('')).toBeNull();
    expect(suggestedPostalCode(null)).toBeNull();
    expect(suggestedPostalCode(undefined)).toBeNull();
    expect(suggestedPostalCode('ZZ')).toBeNull();
  });

  it('only returns postal codes for known countries', () => {
    expect(findCountryByCode('UG')?.name).toBe('Uganda');
    expect(findCountryByName('Kenya')?.code).toBe('KE');
  });
});