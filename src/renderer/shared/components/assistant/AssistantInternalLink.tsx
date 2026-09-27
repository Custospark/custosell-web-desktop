import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../../app/contexts/AppContext';

/** In-app agent link. On phones the full-screen panel steps aside so the
 * destination is visible; on larger screens the docked panel stays open. */
export function AssistantInternalLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const { dispatch } = useAppContext();
  return (
    <Link
      to={to}
      className={className}
      onClick={() => {
        if (window.innerWidth < 768) {
          dispatch({ type: 'SET_ASSISTANT_OPEN', payload: false });
        }
      }}
    >
      {children}
    </Link>
  );
}
