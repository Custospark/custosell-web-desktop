import { useRef, useState, type InputHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export function SearchInput({ className, value, onChange, onClear, placeholder = 'Search...', ...props }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full">
      <div className="relative rounded-lg p-[2px]">
        <motion.div
          className="absolute inset-0 z-0 rounded-lg"
          style={{
            background: 'linear-gradient(90deg, #2563eb, #059669, #2563eb)',
            backgroundSize: '300% 100%',
          }}
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: isFocused ? 2 : 6, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative overflow-hidden rounded-[6px] bg-white">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors pointer-events-none ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={onChange}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            placeholder={placeholder}
            className={`w-full rounded-[6px] border-transparent bg-white py-2.5 pl-9 pr-10 text-sm text-gray-900 focus:outline-none ${className ?? ''}`}
            {...props}
          />
          {value && (value as string).length > 0 && onClear && (
            <button
              type="button"
              onClick={() => { onClear(); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}