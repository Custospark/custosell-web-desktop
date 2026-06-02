import { useState, useCallback, type ReactNode } from 'react';
import { ConfirmContext, type ConfirmOptions } from './ConfirmContext';
import { ConfirmDialog } from './ConfirmDialog';

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => setResolver(() => resolve));
  }, []);

  const handleConfirm = () => { resolver?.(true); setOptions(null); setResolver(null); };
  const handleCancel = () => { resolver?.(false); setOptions(null); setResolver(null); };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog open={!!options} options={options} onConfirm={handleConfirm} onCancel={handleCancel} />
    </ConfirmContext.Provider>
  );
}
