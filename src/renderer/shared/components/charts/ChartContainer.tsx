import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ChartContainerProps {
  /** Tailwind height class, e.g. `h-72` */
  className?: string;
  /** Explicit pixel height fallback when parent layout is still settling */
  minHeight?: number;
  children: (size: { width: number; height: number }) => ReactNode;
}

/**
 * Recharts' ResponsiveContainer throws when mounted at 0×0 (sidebar resize, route transition, etc.).
 * Wait for a real box size before rendering the chart.
 */
export function ChartContainer({ className, minHeight = 288, children }: ChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width > 0 && height > 0) {
        setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = size.width > 0 && size.height > 0;

  return (
    <div
      ref={ref}
      className={cn('w-full', className)}
      style={{ minHeight }}
    >
      {ready ? children(size) : null}
    </div>
  );
}
