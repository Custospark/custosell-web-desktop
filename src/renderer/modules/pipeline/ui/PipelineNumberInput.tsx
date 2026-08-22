import { useState, type FocusEvent } from 'react';
import { pipelineInputClass } from './pipelineFormFields';
import { cn } from '../../../shared/utils/cn';

interface PipelineNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}

/**
 * Number input that clears its default "0" the moment the user focuses it,
 * so typing a real value never fights a pre-filled zero. Keeps a string
 * buffer while focused so typing works naturally (including partial values
 * like "-", "." or empty), and only commits numeric changes on blur.
 *
 * The external value re-seeds the buffer when the field is NOT focused, so
 * live server/prop updates never clobber an in-progress edit.
 */
export function PipelineNumberInput({
  value,
  onChange,
  min = 0,
  max,
  className,
  placeholder,
  disabled,
  title,
  'aria-label': ariaLabel,
}: PipelineNumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>(() => (value === 0 ? '' : String(value)));

  const display = focused ? draft : value === 0 ? '' : String(value);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(0);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return;
    const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
    onChange(Math.max(min, clamped));
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setDraft(value === 0 ? '' : String(value));
    setFocused(true);
    requestAnimationFrame(() => event.target.select());
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      value={display}
      min={min}
      max={max}
      placeholder={placeholder}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      onFocus={handleFocus}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        setFocused(false);
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className={cn(pipelineInputClass, className)}
    />
  );
}