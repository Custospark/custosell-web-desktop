import { useState } from 'react';
import { cn } from '../../utils/cn';
import { formatTendered, parseTendered } from '../../utils/moneyInput';

interface MoneyInputProps {
  /** Numeric value controlled by the parent. */
  value: number;
  /** Called with the parsed numeric value on every change. */
  onValueChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: number;
  title?: string;
}

/**
 * Money text input that groups thousands with commas as the user types
 * (like the POS Discount field). Keeps a local formatted copy while the
 * user is editing, then emits a clean parsed number.
 */
export function MoneyInput({
  value,
  onValueChange,
  placeholder,
  className,
  disabled,
  min,
  title,
}: MoneyInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const display = draft ?? (value > 0 ? formatTendered(String(value)) : '');

  return (
    <input
      title={title}
      type="text"
      inputMode="decimal"
      min={min}
      disabled={disabled}
      className={cn(
        'block w-full border border-gray-300 rounded-md text-sm font-medium tabular-nums text-right py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
        className,
      )}
      placeholder={placeholder}
      value={display}
      onChange={(e) => {
        const formatted = formatTendered(e.target.value);
        setDraft(formatted);
        const parsed = parseTendered(formatted);
        if (min != null && parsed < min) return;
        onValueChange(parsed);
      }}
      onFocus={(e) => {
        setDraft(value > 0 ? formatTendered(String(value)) : '');
        e.target.select();
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export default MoneyInput;