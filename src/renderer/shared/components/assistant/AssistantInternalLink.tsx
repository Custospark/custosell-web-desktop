import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../../app/contexts/AppContext';

/** In-app agent link. Closes the panel when it would cover the destination
 * (phones, or fullscreen takeover) so the new screen opens fully visible. */
export function AssistantInternalLink({
  to,
  className,
  children,
  expanded = false,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  expanded?: boolean;
}) {
  const { dispatch } = useAppContext();
  return (
    <Link
      to={to}
      className={className}
      onClick={() => {
        if (expanded || window.innerWidth < 768) {
          dispatch({ type: 'SET_ASSISTANT_OPEN', payload: false });
        }
      }}
    >
      {children}
    </Link>
  );
}
