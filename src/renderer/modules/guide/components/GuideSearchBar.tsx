import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface GuideSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  title: string;
  disabled?: boolean;
}

export function GuideSearchBar({
  value,
  onChange,
  placeholder,
  title,
  disabled,
}: GuideSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full">
      <div className="relative rounded-lg p-[2px]">
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'linear-gradient(90deg, #2563eb, #059669, #2563eb)',
            backgroundSize: '300% 100%',
          }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: isFocused ? 2 : 6, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative overflow-hidden rounded-[6px] bg-white">
          <Search
            className={cn(
              'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
              isFocused ? 'text-blue-500' : 'text-gray-400',
            )}
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            title={title}
            placeholder={placeholder}
            aria-label={title}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full rounded-[6px] border-transparent bg-white py-2.5 pl-9 pr-10 text-sm text-gray-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          {value && !disabled && (
            <button
              type="button"
              title="Clear search"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
