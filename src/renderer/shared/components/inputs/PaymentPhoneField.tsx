import { useState } from 'react';
import { PhoneNumberField } from './PhoneNumberField';
import { parseInternationalPhone, buildInternationalPhone } from '../../utils/phoneNumber';
import type { CountryCode } from '../../utils/countryCodes';

interface PaymentPhoneFieldProps {
  /** Full international number already on file (may be empty). Seeds the picker. */
  initialPhone: string;
  /** Called with the full international number whenever it changes. */
  onChange: (fullPhone: string | undefined) => void;
  label?: string;
  required?: boolean;
}

/**
 * Editable mobile-money number with country dial-code picker, used across the
 * subscription payment modals so a missing/incorrect payer number never blocks
 * payment or gets sent to the backend as empty.
 */
export default function PaymentPhoneField({
  initialPhone,
  onChange,
  label = 'Mobile Money number',
  required = true,
}: PaymentPhoneFieldProps) {
  const seeded = parseInternationalPhone(initialPhone);
  const [countryCode, setCountryCode] = useState<CountryCode>(seeded.countryCode);
  const [localNumber, setLocalNumber] = useState(seeded.localNumber);

  const handleChange = (nextCountryCode: CountryCode, nextLocal: string) => {
    setCountryCode(nextCountryCode);
    setLocalNumber(nextLocal);
    onChange(buildInternationalPhone(nextCountryCode, nextLocal));
  };

  return (
    <PhoneNumberField
      label={label}
      countryCode={countryCode}
      onCountryCodeChange={(code) => handleChange(code, localNumber)}
      value={localNumber}
      onChange={(value) => handleChange(countryCode, value)}
      required={required}
    />
  );
}
