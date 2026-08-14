import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { countryCodes, type CountryCode } from '../../../shared/utils/countryCodes';

interface CountryCodePickerProps {
  value: CountryCode;
  onChange: (code: CountryCode) => void;
}

export default function CountryCodePicker({ value, onChange }: CountryCodePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
    || c.dial_code.includes(search)
    || c.code.toLowerCase().includes(search),
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-[42px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm hover:border-gray-300 transition-colors"
      >
        <span className="text-lg leading-none">{value.flag}</span>
        <span className="text-sm font-medium text-gray-700">{value.dial_code}</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 w-72 rounded-xl border border-gray-200 bg-white shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
              autoFocus
            />
          </div>
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
                setSearch('');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs text-left hover:bg-indigo-50 transition-colors ${c.code === value.code ? 'bg-indigo-50 font-medium' : ''}`}
            >
              <span className="text-lg">{c.flag}</span>
              <span className="text-gray-800">{c.name}</span>
              <span className="ml-auto text-gray-400">{c.dial_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
