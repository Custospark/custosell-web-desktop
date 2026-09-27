import { useAppContext } from '../../../app/contexts/AppContext';

/**
 * Single source of truth for header density. When the assistant panel is
 * open it docks 360-420px of the viewport, so the header mirrors its
 * mobile self: icons only, no text labels, no brand lockup.
 */
export function useHeaderCompact(): boolean {
  const { state } = useAppContext();
  return state.assistantOpen === true;
}
