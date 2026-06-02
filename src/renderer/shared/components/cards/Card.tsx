import cn from '../../utils/cn';
import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
  hover?: boolean;
  children: ReactNode;
}

export function Card({ padding = true, hover = false, children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-sm',
        padding && 'p-6',
        hover && 'hover:shadow-md transition-shadow',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
