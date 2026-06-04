import cn from '../../utils/cn';
import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
  hover?: boolean;
  accent?: 'blue' | 'green' | 'purple' | 'amber' | 'indigo' | 'none';
  children: ReactNode;
}

const accentStyles: Record<string, string> = {
  blue: 'border-blue-200 hover:border-blue-300',
  green: 'border-green-200 hover:border-green-300',
  purple: 'border-purple-200 hover:border-purple-300',
  amber: 'border-amber-200 hover:border-amber-300',
  indigo: 'border-indigo-200 hover:border-indigo-300',
  none: '',
};

export function Card({ padding = true, hover = false, accent = 'none', children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-sm',
        accentStyles[accent],
        padding && 'p-6',
        (hover || accent !== 'none') && 'hover:shadow-md transition-shadow',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
