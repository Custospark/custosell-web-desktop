import { cn } from '../../utils/cn';
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-sm hover:shadow',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 focus:ring-gray-400',
      outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 focus:ring-blue-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm',
      ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-400',
    };
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
        {loading && <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export { Button };
