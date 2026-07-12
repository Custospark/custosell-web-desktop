import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Phone } from 'lucide-react';
import { countryCodes, type CountryCode } from '../../utils/countryCodes';
import { getPhonePlaceholder } from '../../utils/phoneNumber';
import { cn } from '../../utils/cn';

interface PhoneNumberFieldProps {
  countryCode: CountryCode;
  onCountryCodeChange: (code: CountryCode) => void;
  value: string;
  onChange: (localNumber: string) => void;
  disabled?: boolean;
  required?: boolean;
  showPreview?: boolean;
  label?: string;
  placeholder?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export function PhoneNumberField({
  countryCode,
  onCountryCodeChange,
  value,
  onChange,
  disabled,
  required,
  showPreview = true,
  label,
  placeholder,
  inputClassName,
  buttonClassName,
}: PhoneNumberFieldProps) {
  const resolvedPlaceholder = placeholder ?? getPhonePlaceholder(countryCode);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const filtered = countryCodes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
      || c.dial_code.includes(search)
      || c.code.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target)
        || buttonRef.current?.contains(target)
      ) {
        return;
      }
      setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!dropdownOpen || !buttonRef.current) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 288),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [dropdownOpen]);

  return (
    <div>
      {label ? (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <button
            ref={buttonRef}
            type="button"
            disabled={disabled}
            onClick={() => setDropdownOpen((open) => !open)}
            className={cn(
              'flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
              buttonClassName,
            )}
          >
            <span className="text-lg">{countryCode.flag}</span>
            <span className="text-sm font-medium text-gray-700">{countryCode.dial_code}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {dropdownOpen && !disabled && menuPosition && createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[22000] max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
              }}
            >
              <div className="sticky top-0 border-b border-gray-100 bg-white p-2">
                <input
                  type="text"
                  placeholder="Search country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onCountryCodeChange(c);
                    setDropdownOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-blue-50',
                    c.code === countryCode.code && 'bg-blue-50 font-medium',
                  )}
                >
                  <span className="text-lg">{c.flag}</span>
                  <span className="text-gray-800">{c.name}</span>
                  <span className="ml-auto text-gray-400">{c.dial_code}</span>
                </button>
              ))}
            </div>,
            document.body,
          )}
        </div>
        <div className="relative min-w-0 flex-1">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="tel"
            placeholder={resolvedPlaceholder}
            value={value}
            disabled={disabled}
            required={required}
            onChange={(e) => onChange(e.target.value.replace(/[^\d\s\-()]/g, ''))}
            className={cn(
              'w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
              inputClassName,
            )}
          />
        </div>
      </div>
      {showPreview && value && (
        <p className="mt-1 text-xs text-gray-400">
          Full number: {countryCode.dial_code} {value}
        </p>
      )}
    </div>
  );
}
