import { useAppContext } from '../../../app/contexts/AppContext';

/**
 * Right padding reserving dock space for the open assistant drawer, so page
 * content yields instead of sliding underneath. Widths mirror the panel
 * itself (360 / 380 / 420). Below md the panel is a focused takeover.
 * Pair with `transition-[padding-right]` on the shell.
 */
export function useAssistantPushClass(): string {
  const { state } = useAppContext();
  return state.assistantOpen ? 'md:pr-[360px] lg:pr-[380px] xl:pr-[420px]' : '';
}
