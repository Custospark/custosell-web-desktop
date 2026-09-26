import { useAppContext } from '../../../app/contexts/AppContext';

/**
 * Right padding reserving dock space for the open assistant drawer on large
 * screens, so page content yields instead of sliding underneath. Small screens
 * keep the overlay drawer. Pair with `transition-[padding-right]` on the shell.
 */
export function useAssistantPushClass(): string {
  const { state } = useAppContext();
  return state.assistantOpen ? 'lg:pr-[420px]' : '';
}
