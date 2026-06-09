import { countryCodes, type CountryCode } from './countryCodes';

const DEFAULT_COUNTRY =
  countryCodes.find((c) => c.code === 'UG') ?? countryCodes[0];

const DIAL_CODES_LONGEST_FIRST = [...countryCodes].sort(
  (a, b) => b.dial_code.length - a.dial_code.length,
);

export function getDefaultCountryCode(): CountryCode {
  return DEFAULT_COUNTRY;
}

export function parseInternationalPhone(fullPhone: string | null | undefined): {
  countryCode: CountryCode;
  localNumber: string;
} {
  if (!fullPhone?.trim()) {
    return { countryCode: DEFAULT_COUNTRY, localNumber: '' };
  }

  const normalized = fullPhone.replace(/\s/g, '');
  for (const country of DIAL_CODES_LONGEST_FIRST) {
    if (normalized.startsWith(country.dial_code)) {
      return {
        countryCode: country,
        localNumber: normalized.slice(country.dial_code.length),
      };
    }
  }

  return {
    countryCode: DEFAULT_COUNTRY,
    localNumber: normalized.replace(/^\+/, ''),
  };
}

export function buildInternationalPhone(
  countryCode: CountryCode,
  localNumber: string,
): string | undefined {
  const digits = localNumber.replace(/\D/g, '');
  if (!digits) return undefined;
  return `${countryCode.dial_code}${digits}`;
}

export function formatPhoneDisplay(fullPhone: string | null | undefined): string {
  if (!fullPhone?.trim()) return '—';
  const { countryCode, localNumber } = parseInternationalPhone(fullPhone);
  if (!localNumber.trim()) return fullPhone;
  return `${countryCode.dial_code} ${localNumber}`.trim();
}

/** Example local number for placeholders (without country dial code). */
export function getPhonePlaceholder(countryCode: CountryCode): string {
  switch (countryCode.code) {
    case 'US':
    case 'CA':
      return 'e.g. 555 123 4567';
    case 'GB':
      return 'e.g. 7911 123456';
    case 'IN':
      return 'e.g. 98765 43210';
    case 'ZA':
      return 'e.g. 82 123 4567';
    default:
      return 'e.g. 712 345 678';
  }
}
